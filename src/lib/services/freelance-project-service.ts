import mongoose from "mongoose";
import {
  Expense,
  FreelanceProject,
  Project,
  type FreelanceProjectStatus,
  type IFreelanceProject,
} from "@/lib/models";
import { monthDateBoundsUTC } from "@/lib/db-month-filters";
import { normalizePaymentMethod } from "@/lib/payment-method";
import { buildProjectTypeMongoFilter, normalizeProjectType } from "@/lib/project-type";
import { normalizeWorkPhase, type WorkPhase } from "@/lib/project-work-phase";
import type {
  ProjectJobListFilters,
  ProjectJobListMeta,
  ProjectJobListTotals,
} from "@/lib/project-job-filters";
import { PROJECT_JOBS_PAGE_SIZE } from "@/lib/project-job-filters";
import { toPaginatedBodyFromExtraRow } from "@/lib/api/list-pagination";
import type { ProjectJobDto } from "@/types/project-job";
import {
  derivePaymentStatus,
  effectiveWorkPhase,
} from "@/lib/project-job-rules";

export type { ProjectJobDto };

async function sumCollectedForJob(userId: string, jobId: mongoose.Types.ObjectId) {
  const rows = await Project.find({
    userId,
    freelanceProjectId: jobId,
    $or: [{ isCollected: true }, { isCollected: { $exists: false } }],
  }).lean();
  return rows.reduce((s, p) => s + p.amount, 0);
}

/** Sync stored status + workPhase from actual payout rows. */
export async function repairAllProjectJobStates(userId: string) {
  const uid = new mongoose.Types.ObjectId(userId);
  const jobs = await FreelanceProject.find({ userId: uid })
    .select("_id agreedAmount status workPhase")
    .lean();

  for (const job of jobs) {
    const jobId =
      typeof job._id === "string" ? new mongoose.Types.ObjectId(job._id) : job._id;
    const collected = await sumCollectedForJob(userId, jobId);
    const status = derivePaymentStatus(job.agreedAmount, collected);
    const workPhase = effectiveWorkPhase(job.workPhase, job.agreedAmount, collected);
    const patch: Partial<{ status: FreelanceProjectStatus; workPhase: WorkPhase }> = {};
    if (job.status !== status) patch.status = status;
    if (normalizeWorkPhase(job.workPhase) !== workPhase) patch.workPhase = workPhase;
    if (Object.keys(patch).length > 0) {
      await FreelanceProject.updateOne({ _id: job._id }, { $set: patch });
    }
  }
}

async function spentForJob(
  userId: mongoose.Types.ObjectId,
  jobId: mongoose.Types.ObjectId,
  jobName: string,
  mStart?: Date,
  mEnd?: Date
) {
  const dateFilter =
    mStart && mEnd ? { date: { $gte: mStart, $lte: mEnd } } : {};

  const [expNon, expTpl] = await Promise.all([
    Expense.find({
      userId,
      isTemplate: false,
      ...dateFilter,
      $or: [
        { freelanceProjectId: jobId },
        { projectName: { $regex: new RegExp(`^${escapeRegex(jobName.trim())}$`, "i") } },
      ],
    }).lean(),
    mStart && mEnd
      ? Expense.find({
          userId,
          isTemplate: true,
          recurring: true,
          validFrom: { $lte: mEnd },
          $and: [
            { $or: [{ validTo: null }, { validTo: { $gte: mStart } }] },
            {
              $or: [
                { freelanceProjectId: jobId },
                { projectName: { $regex: new RegExp(`^${escapeRegex(jobName.trim())}$`, "i") } },
              ],
            },
          ],
        }).lean()
      : Promise.resolve([]),
  ]);

  let total = 0;
  for (const e of expNon) total += e.amount;
  for (const e of expTpl) total += e.amount;
  return total;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildProjectJobsMongoQuery(
  uid: mongoose.Types.ObjectId,
  filters?: ProjectJobListFilters
) {
  const query: Record<string, unknown> = { userId: uid };

  if (filters?.collected === "collected") {
    query.status = "collected";
  } else if (filters?.collected === "pending") {
    query.status = { $in: ["pending", "partial"] };
  }

  if (filters?.billing === "billed") {
    query.billingStatus = "billed";
  } else if (filters?.billing === "unbilled") {
    query.billingStatus = { $ne: "billed" };
  }

  if (filters?.projectType && filters.projectType !== "all") {
    Object.assign(query, buildProjectTypeMongoFilter(normalizeProjectType(filters.projectType)));
  }

  if (filters?.client?.trim()) {
    query.clientName = {
      $regex: new RegExp(`^${escapeRegex(filters.client.trim())}$`, "i"),
    };
  }

  if (filters?.workPhase && filters.workPhase !== "all") {
    query.workPhase = filters.workPhase;
  }

  if (filters?.archive === "archived") {
    query.isArchived = true;
  } else if (filters?.archive !== "all") {
    query.isArchived = { $ne: true };
  }

  if (filters?.q?.trim()) {
    query.name = { $regex: escapeRegex(filters.q.trim()), $options: "i" };
  }

  return query;
}

function buildProjectJobsSort(filters?: ProjectJobListFilters) {
  const sort = filters?.sort ?? "createdAt_desc";
  const [sortField, sortDir] = sort.split("_") as ["createdAt" | "startDate", "asc" | "desc"];
  return {
    [sortField]: sortDir === "asc" ? 1 : -1,
    _id: sortDir === "asc" ? 1 : -1,
  } as Record<string, 1 | -1>;
}

async function aggregateFilteredTotals(
  uid: mongoose.Types.ObjectId,
  query: Record<string, unknown>
): Promise<ProjectJobListTotals> {
  const jobs = await FreelanceProject.find(query).select("_id agreedAmount").lean();
  if (jobs.length === 0) {
    return { agreed: 0, collected: 0, pending: 0, spent: 0, net: 0 };
  }

  const jobIds = jobs.map((j) => j._id);
  const agreed = jobs.reduce((s, j) => s + j.agreedAmount, 0);

  const [payoutAgg, expenseAgg] = await Promise.all([
    Project.aggregate<{ total: number }>([
      {
        $match: {
          userId: uid,
          freelanceProjectId: { $in: jobIds },
          $or: [{ isCollected: true }, { isCollected: { $exists: false } }],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate<{ total: number }>([
      {
        $match: {
          userId: uid,
          isTemplate: false,
          freelanceProjectId: { $in: jobIds },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const collected = payoutAgg[0]?.total ?? 0;
  const spent = expenseAgg[0]?.total ?? 0;
  const pending = Math.max(0, agreed - collected);

  return { agreed, collected, pending, spent, net: collected - spent };
}

export async function syncJobStatus(jobId: string, userId: string) {
  const job = await FreelanceProject.findOne({
    _id: jobId,
    userId,
  }).lean();
  if (!job) return null;

  const payouts = await Project.find({
    userId,
    freelanceProjectId: job._id,
    $or: [{ isCollected: true }, { isCollected: { $exists: false } }],
  }).lean();
  const collected = payouts.reduce((s, p) => s + p.amount, 0);
  const status = derivePaymentStatus(job.agreedAmount, collected);
  const workPhase = effectiveWorkPhase(job.workPhase, job.agreedAmount, collected);
  await FreelanceProject.updateOne({ _id: job._id }, { $set: { status, workPhase } });
  return status;
}

export async function buildProjectJobDto(
  job: IFreelanceProject & { _id: mongoose.Types.ObjectId | string },
  userId: string
): Promise<ProjectJobDto> {
  const uid = new mongoose.Types.ObjectId(userId);
  const jobId =
    typeof job._id === "string" ? new mongoose.Types.ObjectId(job._id) : job._id;
  const [payouts, costs] = await Promise.all([
    Project.find({ userId: uid, freelanceProjectId: jobId })
      .sort({ date: -1 })
      .lean(),
    Expense.find({
      userId: uid,
      isTemplate: false,
      $or: [{ freelanceProjectId: jobId }, { projectName: job.name }],
    })
      .sort({ date: -1 })
      .limit(50)
      .lean(),
  ]);

  const collectedAmount = payouts
    .filter((p) => p.isCollected !== false)
    .reduce((s, p) => s + p.amount, 0);
  const spentAmount = await spentForJob(uid, jobId, job.name);
  const derivedStatus = derivePaymentStatus(job.agreedAmount, collectedAmount);
  const derivedWorkPhase = effectiveWorkPhase(job.workPhase, job.agreedAmount, collectedAmount);

  const currency = job.currency === "SAR" ? "SAR" : "EGP";
  const originalAmount =
    typeof job.originalAmount === "number" && Number.isFinite(job.originalAmount)
      ? job.originalAmount
      : job.agreedAmount;
  const exchangeRateToEgp =
    typeof job.exchangeRateToEgp === "number" &&
    Number.isFinite(job.exchangeRateToEgp) &&
    job.exchangeRateToEgp > 0
      ? job.exchangeRateToEgp
      : 1;

  return {
    id: String(job._id),
    name: job.name,
    agreedAmount: job.agreedAmount,
    currency,
    originalAmount,
    exchangeRateToEgp,
    billingStatus: job.billingStatus === "billed" ? "billed" : "unbilled",
    invoiceId: job.invoiceId ? String(job.invoiceId) : null,
    status: job.status === "cancelled" ? "cancelled" : derivedStatus,
    workPhase: derivedWorkPhase,
    cancellationReason: job.cancellationReason?.trim() ?? "",
    isArchived: Boolean(job.isArchived),
    archivedAt: job.archivedAt ? job.archivedAt.toISOString() : null,
    profitMarginPct:
      collectedAmount > 0.005
        ? Math.round(((collectedAmount - spentAmount) / collectedAmount) * 1000) / 10
        : null,
    notes: job.notes?.trim() ?? "",
    startDate: job.startDate.toISOString(),
    createdAt: job.createdAt.toISOString(),
    expectedPaymentDate: job.expectedPaymentDate
      ? job.expectedPaymentDate.toISOString()
      : null,
    expectedPaymentMethod: normalizePaymentMethod(job.expectedPaymentMethod),
    projectType: normalizeProjectType(job.projectType),
    clientName: job.clientName?.trim() ?? "",
    scopeItems: (job.scopeItems ?? []).map((item) => ({
      title: item.title,
      description: item.description?.trim() ?? "",
      amount: item.amount,
      complexity: item.complexity,
      tech: item.tech?.trim() ?? "",
    })),
    collectedAmount,
    pendingAmount: Math.max(0, job.agreedAmount - collectedAmount),
    spentAmount,
    netCollected: collectedAmount - spentAmount,
    payouts: payouts
      .map((p) => ({
        id: String(p._id),
        amount: p.amount,
        date: p.date.toISOString(),
        isCollected: p.isCollected !== false,
        collectedAt: p.collectedAt ? p.collectedAt.toISOString() : null,
        paymentMethod: normalizePaymentMethod(p.paymentMethod),
        note: p.note?.trim() ?? "",
      }))
      .sort((a, b) => {
        if (a.isCollected !== b.isCollected) return a.isCollected ? 1 : -1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }),
    costs: costs.map((c) => ({
      id: String(c._id),
      title: c.title,
      amount: c.amount,
      date: c.date.toISOString(),
      category: c.category,
      paymentMethod: normalizePaymentMethod(c.paymentMethod),
    })),
  };
}

export async function listProjectJobs(
  userId: string,
  filters?: ProjectJobListFilters,
  pagination?: { offset: number; limit: number }
) {
  const uid = new mongoose.Types.ObjectId(userId);
  const query = buildProjectJobsMongoQuery(uid, filters);
  const sortSpec = buildProjectJobsSort(filters);
  const limit = pagination?.limit ?? PROJECT_JOBS_PAGE_SIZE;
  const offset = pagination?.offset ?? 0;

  await repairAllProjectJobStates(userId);

  const [filteredTotal, totalAll, jobDocs, totals] = await Promise.all([
    FreelanceProject.countDocuments(query),
    FreelanceProject.countDocuments({ userId: uid }),
    FreelanceProject.find(query).sort(sortSpec).skip(offset).limit(limit + 1).lean(),
    aggregateFilteredTotals(uid, query),
  ]);

  const paginated = toPaginatedBodyFromExtraRow(jobDocs, offset, limit);
  const rows = await Promise.all(paginated.data.map((j) => buildProjectJobDto(j, userId)));

  const meta: ProjectJobListMeta = {
    total: filteredTotal,
    totalAll,
    shown: filteredTotal,
    loaded: offset + rows.length,
    offset,
    limit,
    totals,
  };

  return {
    rows,
    hasMore: paginated.hasMore,
    nextOffset: paginated.nextOffset,
    meta,
  };
}

export type NormalProjectPreview = {
  id: string;
  name: string;
  clientName: string;
  pendingAmount: number;
  status: "pending" | "partial";
};

export type NormalProjectsSummary = {
  total: number;
  uncollectedCount: number;
  collectedCount: number;
  pendingAmount: number;
  collectedAmount: number;
  preview: NormalProjectPreview[];
};

export async function getNormalProjectsSummary(userId: string): Promise<NormalProjectsSummary> {
  const uid = new mongoose.Types.ObjectId(userId);
  const query = {
    userId: uid,
    status: { $ne: "cancelled" },
    isArchived: { $ne: true },
    ...buildProjectTypeMongoFilter("normal"),
  };

  const jobs = await FreelanceProject.find(query)
    .select("_id name clientName agreedAmount")
    .lean();

  if (jobs.length === 0) {
    return {
      total: 0,
      uncollectedCount: 0,
      collectedCount: 0,
      pendingAmount: 0,
      collectedAmount: 0,
      preview: [],
    };
  }

  const jobIds = jobs.map((j) => j._id);
  const payoutAgg = await Project.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
    {
      $match: {
        userId: uid,
        freelanceProjectId: { $in: jobIds },
        $or: [{ isCollected: true }, { isCollected: { $exists: false } }],
      },
    },
    { $group: { _id: "$freelanceProjectId", total: { $sum: "$amount" } } },
  ]);
  const collectedMap = new Map(payoutAgg.map((r) => [String(r._id), r.total]));

  let uncollectedCount = 0;
  let collectedCount = 0;
  let pendingAmount = 0;
  let collectedAmount = 0;
  const uncollected: NormalProjectPreview[] = [];

  for (const job of jobs) {
    const collected = collectedMap.get(String(job._id)) ?? 0;
    const pending = Math.max(0, job.agreedAmount - collected);
    collectedAmount += collected;
    const paymentStatus = derivePaymentStatus(job.agreedAmount, collected);

    if (paymentStatus === "collected") {
      collectedCount += 1;
    } else {
      uncollectedCount += 1;
      pendingAmount += pending;
      uncollected.push({
        id: String(job._id),
        name: job.name,
        clientName: job.clientName?.trim() ?? "",
        pendingAmount: pending,
        status: paymentStatus === "partial" ? "partial" : "pending",
      });
    }
  }

  uncollected.sort((a, b) => b.pendingAmount - a.pendingAmount);

  return {
    total: jobs.length,
    uncollectedCount,
    collectedCount,
    pendingAmount,
    collectedAmount,
    preview: uncollected.slice(0, 4),
  };
}

export async function monthPlByFreelanceJob(userId: string, year: number, month: number) {
  const uid = new mongoose.Types.ObjectId(userId);
  const { mStart, mEnd } = monthDateBoundsUTC(year, month);
  const jobs = await FreelanceProject.find({ userId: uid }).lean();

  const rows = await Promise.all(
    jobs.map(async (job) => {
      const jobOid =
        typeof job._id === "string" ? new mongoose.Types.ObjectId(job._id) : job._id;
      const payouts = await Project.find({
        userId: uid,
        freelanceProjectId: jobOid,
        date: { $gte: mStart, $lte: mEnd },
        $or: [{ isCollected: true }, { isCollected: { $exists: false } }],
      }).lean();
      const received = payouts.reduce((s, p) => s + p.amount, 0);
      const spent = await spentForJob(uid, jobOid, job.name, mStart, mEnd);
      return {
        key: String(job._id),
        label: job.name,
        agreedAmount: job.agreedAmount,
        received,
        spent,
        net: received - spent,
        status: job.status,
      };
    })
  );

  return rows.filter((r) => r.received > 0 || r.spent > 0 || r.agreedAmount > 0);
}
