import mongoose from "mongoose";
import {
  Expense,
  FreelanceProject,
  Project,
  type FreelanceProjectStatus,
  type IFreelanceProject,
} from "@/lib/models";
import { monthDateBoundsUTC } from "@/lib/db-month-filters";
import { normalizeBillingMode } from "@/lib/billing-mode";
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
  pendingAmountForJob,
} from "@/lib/project-job-rules";

export type { ProjectJobDto };

/**
 * Sync stored status + workPhase from payout totals (batched — not N+1).
 * Prefer calling from write paths; list GET no longer awaits this.
 */
export async function repairAllProjectJobStates(userId: string) {
  const uid = new mongoose.Types.ObjectId(userId);
  const jobs = await FreelanceProject.find({ userId: uid })
    .select("_id agreedAmount status workPhase billingMode")
    .lean();
  if (jobs.length === 0) return;

  const jobIds = jobs.map((j) =>
    typeof j._id === "string" ? new mongoose.Types.ObjectId(j._id) : j._id
  );
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

  const ops = [];

  for (const job of jobs) {
    const collected = collectedMap.get(String(job._id)) ?? 0;
    const status = derivePaymentStatus(job.agreedAmount, collected, job.billingMode);
    const workPhase = effectiveWorkPhase(job.workPhase, job.agreedAmount, collected, job.billingMode);
    const patch: Partial<{ status: FreelanceProjectStatus; workPhase: WorkPhase }> = {};
    if (job.status !== status) patch.status = status;
    if (normalizeWorkPhase(job.workPhase) !== workPhase) patch.workPhase = workPhase;
    if (Object.keys(patch).length > 0) {
      ops.push({
        updateOne: {
          filter: { _id: String(job._id) },
          update: { $set: patch },
        },
      });
    }
  }

  if (ops.length > 0) {
    await FreelanceProject.bulkWrite(ops, { ordered: false });
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

  // Default: uncollected only. `collected=all` includes paid jobs (still excludes cancelled).
  if (filters?.collected === "all") {
    query.status = { $ne: "cancelled" };
  } else {
    query.status = { $in: ["pending", "partial"] };
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

const LIST_JOB_SELECT =
  "_id name clientName projectEmail projectPassword agreedAmount currency originalAmount exchangeRateToEgp billingStatus billingMode invoiceId status workPhase isArchived archivedAt startDate createdAt expectedPaymentDate expectedPaymentMethod projectType";

async function aggregateFilteredTotals(
  uid: mongoose.Types.ObjectId,
  query: Record<string, unknown>
): Promise<ProjectJobListTotals> {
  const [agreedAgg, jobIds] = await Promise.all([
    FreelanceProject.aggregate<{ agreed: number }>([
      { $match: query },
      { $group: { _id: null, agreed: { $sum: "$agreedAmount" } } },
    ]),
    FreelanceProject.distinct("_id", query),
  ]);

  const agreed = agreedAgg[0]?.agreed ?? 0;
  if (jobIds.length === 0) {
    return { agreed: 0, collected: 0, pending: 0, spent: 0, net: 0 };
  }

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
  const status = derivePaymentStatus(job.agreedAmount, collected, job.billingMode);
  const workPhase = effectiveWorkPhase(job.workPhase, job.agreedAmount, collected, job.billingMode);
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
  const costMatch = {
    userId: uid,
    isTemplate: false,
    $or: [
      { freelanceProjectId: jobId },
      {
        projectName: {
          $regex: `^${escapeRegex(job.name.trim())}$`,
          $options: "i",
        },
      },
    ],
  };

  const [payouts, costs, spentAgg] = await Promise.all([
    Project.find({ userId: uid, freelanceProjectId: jobId })
      .select("amount date isCollected collectedAt paymentMethod note lineKind")
      .sort({ date: -1 })
      .lean(),
    Expense.find(costMatch)
      .select("title amount date category paymentMethod")
      .sort({ date: -1 })
      .limit(50)
      .lean(),
    Expense.aggregate<{ total: number }>([
      { $match: costMatch },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const collectedAmount = payouts
    .filter((p) => p.isCollected !== false)
    .reduce((s, p) => s + p.amount, 0);
  const spentAmount = spentAgg[0]?.total ?? 0;
  const uncollectedAmount = payouts
    .filter((p) => p.isCollected === false && p.lineKind !== "support")
    .reduce((s, p) => s + p.amount, 0);
  const derivedStatus = derivePaymentStatus(job.agreedAmount, collectedAmount, job.billingMode);
  const derivedWorkPhase = effectiveWorkPhase(
    job.workPhase,
    job.agreedAmount,
    collectedAmount,
    job.billingMode
  );

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
    billingMode: normalizeBillingMode(job.billingMode),
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
    projectEmail: job.projectEmail?.trim() ?? "",
    projectPassword: job.projectPassword?.trim() ?? "",
    scopeItems: (job.scopeItems ?? []).map((item) => ({
      title: item.title,
      description: item.description?.trim() ?? "",
      amount: item.amount,
      complexity: item.complexity,
      tech: item.tech?.trim() ?? "",
    })),
    collectedAmount,
    pendingAmount: pendingAmountForJob(
      job.agreedAmount,
      collectedAmount,
      uncollectedAmount,
      job.billingMode
    ),
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
        note: p.isCollected !== false && p.note?.trim() === "Pending collection" ? "" : p.note?.trim() ?? "",
        lineKind: (p.lineKind === "support" ? "support" : "installment") as "installment" | "support",
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

/** Lightweight list rows: 2 aggregates for the page, no per-job payout/cost lists. */
async function buildProjectJobListDtos(
  jobs: (IFreelanceProject & { _id: mongoose.Types.ObjectId | string })[],
  userId: string
): Promise<ProjectJobDto[]> {
  if (jobs.length === 0) return [];
  const uid = new mongoose.Types.ObjectId(userId);
  const jobIds = jobs.map((j) =>
    typeof j._id === "string" ? new mongoose.Types.ObjectId(j._id) : j._id
  );

  const [payoutAgg, uncollectedAgg, expenseAgg] = await Promise.all([
    Project.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      {
        $match: {
          userId: uid,
          freelanceProjectId: { $in: jobIds },
          $or: [{ isCollected: true }, { isCollected: { $exists: false } }],
        },
      },
      { $group: { _id: "$freelanceProjectId", total: { $sum: "$amount" } } },
    ]),
    Project.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      {
        $match: {
          userId: uid,
          freelanceProjectId: { $in: jobIds },
          isCollected: false,
          lineKind: { $ne: "support" },
        },
      },
      { $group: { _id: "$freelanceProjectId", total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
      {
        $match: {
          userId: uid,
          isTemplate: false,
          freelanceProjectId: { $in: jobIds },
        },
      },
      { $group: { _id: "$freelanceProjectId", total: { $sum: "$amount" } } },
    ]),
  ]);

  const collectedMap = new Map(payoutAgg.map((r) => [String(r._id), r.total]));
  const uncollectedMap = new Map(uncollectedAgg.map((r) => [String(r._id), r.total]));
  const spentMap = new Map(expenseAgg.map((r) => [String(r._id), r.total]));

  return jobs.map((job) => {
    const collectedAmount = collectedMap.get(String(job._id)) ?? 0;
    const uncollectedAmount = uncollectedMap.get(String(job._id)) ?? 0;
    const spentAmount = spentMap.get(String(job._id)) ?? 0;
    const derivedStatus = derivePaymentStatus(job.agreedAmount, collectedAmount, job.billingMode);
    const derivedWorkPhase = effectiveWorkPhase(
      job.workPhase,
      job.agreedAmount,
      collectedAmount,
      job.billingMode
    );
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
      billingMode: normalizeBillingMode(job.billingMode),
      invoiceId: job.invoiceId ? String(job.invoiceId) : null,
      status: job.status === "cancelled" ? "cancelled" : derivedStatus,
      workPhase: derivedWorkPhase,
      cancellationReason: "",
      isArchived: Boolean(job.isArchived),
      archivedAt: job.archivedAt ? job.archivedAt.toISOString() : null,
      profitMarginPct:
        collectedAmount > 0.005
          ? Math.round(((collectedAmount - spentAmount) / collectedAmount) * 1000) / 10
          : null,
      notes: "",
      startDate: job.startDate.toISOString(),
      createdAt: job.createdAt.toISOString(),
      expectedPaymentDate: job.expectedPaymentDate
        ? job.expectedPaymentDate.toISOString()
        : null,
      expectedPaymentMethod: normalizePaymentMethod(job.expectedPaymentMethod),
      projectType: normalizeProjectType(job.projectType),
      clientName: job.clientName?.trim() ?? "",
      projectEmail: job.projectEmail?.trim() ?? "",
      projectPassword: job.projectPassword?.trim() ?? "",
      scopeItems: [],
      collectedAmount,
      pendingAmount: pendingAmountForJob(
        job.agreedAmount,
        collectedAmount,
        uncollectedAmount,
        job.billingMode
      ),
      spentAmount,
      netCollected: collectedAmount - spentAmount,
      payouts: [],
      costs: [],
    };
  });
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

  const [filteredTotal, jobDocs, totals] = await Promise.all([
    FreelanceProject.countDocuments(query),
    FreelanceProject.find(query)
      .select(LIST_JOB_SELECT)
      .sort(sortSpec)
      .skip(offset)
      .limit(limit + 1)
      .lean(),
    aggregateFilteredTotals(uid, query),
  ]);

  const paginated = toPaginatedBodyFromExtraRow(jobDocs, offset, limit);
  const rows = await buildProjectJobListDtos(paginated.data as never, userId);

  const meta: ProjectJobListMeta = {
    total: filteredTotal,
    totalAll: filteredTotal,
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
};

export type NormalProjectsSummary = {
  uncollectedCount: number;
  pendingAmount: number;
  preview: NormalProjectPreview[];
};

/** Uncollected Normal jobs only — count + pending total + name chips. */
export async function getNormalProjectsSummary(userId: string): Promise<NormalProjectsSummary> {
  const uid = new mongoose.Types.ObjectId(userId);
  const query = {
    userId: uid,
    isArchived: { $ne: true },
    status: { $in: ["pending", "partial"] as const },
    ...buildProjectTypeMongoFilter("normal"),
  };

  const uncollectedJobs = await FreelanceProject.find(query)
    .select("_id name agreedAmount")
    .lean();

  if (uncollectedJobs.length === 0) {
    return { uncollectedCount: 0, pendingAmount: 0, preview: [] };
  }

  const uncollectedIds = uncollectedJobs.map((j) => j._id);
  const payoutAgg = await Project.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
    {
      $match: {
        userId: uid,
        freelanceProjectId: { $in: uncollectedIds },
        $or: [{ isCollected: true }, { isCollected: { $exists: false } }],
      },
    },
    { $group: { _id: "$freelanceProjectId", total: { $sum: "$amount" } } },
  ]);
  const collectedMap = new Map(payoutAgg.map((r) => [String(r._id), r.total]));

  let pendingAmount = 0;
  const rows: { id: string; name: string; pending: number }[] = [];
  for (const job of uncollectedJobs) {
    const collected = collectedMap.get(String(job._id)) ?? 0;
    const pending = Math.max(0, job.agreedAmount - collected);
    if (pending <= 0.005) continue;
    pendingAmount += pending;
    rows.push({ id: String(job._id), name: job.name, pending });
  }
  rows.sort((a, b) => b.pending - a.pending);

  return {
    uncollectedCount: rows.length,
    pendingAmount,
    preview: rows.map(({ id, name }) => ({ id, name })),
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
