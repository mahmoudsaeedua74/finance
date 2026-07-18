import mongoose from "mongoose";
import { FreelanceProject, Invoice } from "@/lib/models";
import { buildProjectJobDto } from "@/lib/services/freelance-project-service";
import { roundMoney } from "@/lib/currency";
import { buildProjectTypeMongoFilter } from "@/lib/project-type";

export type InvoiceDto = {
  id: string;
  clientName: string;
  jobIds: string[];
  status: "draft" | "issued" | "paid" | "cancelled";
  totalEgp: number;
  notes: string;
  issuedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  jobs: Awaited<ReturnType<typeof buildProjectJobDto>>[];
};

function toDto(
  inv: {
    _id: unknown;
    clientName: string;
    jobIds: unknown[];
    status: InvoiceDto["status"];
    totalEgp: number;
    notes?: string;
    issuedAt?: Date | null;
    paidAt?: Date | null;
    createdAt: Date;
  },
  jobs: InvoiceDto["jobs"]
): InvoiceDto {
  return {
    id: String(inv._id),
    clientName: inv.clientName,
    jobIds: (inv.jobIds ?? []).map((id) => String(id)),
    status: inv.status,
    totalEgp: inv.totalEgp,
    notes: inv.notes?.trim() ?? "",
    issuedAt: inv.issuedAt ? inv.issuedAt.toISOString() : null,
    paidAt: inv.paidAt ? inv.paidAt.toISOString() : null,
    createdAt: inv.createdAt.toISOString(),
    jobs,
  };
}

/** Jobs eligible for a new Normal invoice basket (not billed, not fully collected). */
const BILLABLE_JOB_FILTER = {
  billingStatus: { $ne: "billed" as const },
  status: { $nin: ["cancelled", "collected"] as const },
  isArchived: { $ne: true as const },
};

function assertJobCanBeInvoiced(
  j: {
    name?: string;
    status?: string;
    billingStatus?: string;
    invoiceId?: unknown;
  },
  invoiceId?: string
) {
  if (j.status === "cancelled") throw new Error("Cannot bill a cancelled project");
  if (j.status === "collected") {
    throw new Error(
      `Project already collected — cannot put on invoice: ${j.name ?? ""}`
    );
  }
  if (
    j.billingStatus === "billed" &&
    j.invoiceId &&
    (!invoiceId || String(j.invoiceId) !== invoiceId)
  ) {
    throw new Error(`Project already on another invoice: ${j.name ?? ""}`);
  }
}

async function loadJobsForIds(userId: string, jobIds: string[]) {
  const uid = new mongoose.Types.ObjectId(userId);
  const ids = jobIds.filter((id) => mongoose.isValidObjectId(id));
  if (!ids.length) return [];
  const rows = await FreelanceProject.find({ userId: uid, _id: { $in: ids } }).lean();
  const byId = new Map(rows.map((r) => [String(r._id), r]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  return Promise.all(ordered.map((j) => buildProjectJobDto(j as never, userId)));
}

async function sumEgp(userId: string, jobIds: string[]): Promise<number> {
  const uid = new mongoose.Types.ObjectId(userId);
  const ids = jobIds.filter((id) => mongoose.isValidObjectId(id));
  if (!ids.length) return 0;
  const rows = await FreelanceProject.find({ userId: uid, _id: { $in: ids } })
    .select("agreedAmount")
    .lean();
  return roundMoney(rows.reduce((s, r) => s + (r.agreedAmount ?? 0), 0));
}

async function syncJobBilling(
  userId: string,
  invoiceId: string,
  nextJobIds: string[],
  previousJobIds: string[]
) {
  const uid = new mongoose.Types.ObjectId(userId);
  const invOid = new mongoose.Types.ObjectId(invoiceId);
  const nextSet = new Set(nextJobIds);
  const removed = previousJobIds.filter((id) => !nextSet.has(id));

  if (removed.length) {
    await FreelanceProject.updateMany(
      {
        userId: uid,
        _id: { $in: removed.filter((id) => mongoose.isValidObjectId(id)) },
        invoiceId: invOid,
      },
      { $set: { billingStatus: "unbilled", invoiceId: null } }
    );
  }

  if (nextJobIds.length) {
    await FreelanceProject.updateMany(
      {
        userId: uid,
        _id: { $in: nextJobIds.filter((id) => mongoose.isValidObjectId(id)) },
      },
      { $set: { billingStatus: "billed", invoiceId: invOid } }
    );
  }
}

export async function createInvoice(
  userId: string,
  input: { clientName: string; jobIds: string[]; notes?: string; status?: "draft" | "issued" }
): Promise<InvoiceDto> {
  const clientName = String(input.clientName ?? "").trim();
  const jobIds = Array.from(new Set((input.jobIds ?? []).map(String).filter(Boolean)));
  if (!clientName) throw new Error("clientName required");
  if (!jobIds.length) throw new Error("Select at least one project");

  const uid = new mongoose.Types.ObjectId(userId);
  const jobs = await FreelanceProject.find({
    userId: uid,
    _id: { $in: jobIds },
  }).lean();

  if (jobs.length !== jobIds.length) throw new Error("Some projects were not found");
  for (const j of jobs) {
    if ((j.clientName ?? "").trim().toLowerCase() !== clientName.toLowerCase()) {
      throw new Error("All projects must belong to the same client");
    }
    assertJobCanBeInvoiced(j);
  }

  const totalEgp = roundMoney(jobs.reduce((s, j) => s + j.agreedAmount, 0));
  const status = input.status === "issued" ? "issued" : "draft";
  const inv = await Invoice.create({
    userId: uid,
    clientName,
    jobIds,
    status,
    totalEgp,
    notes: typeof input.notes === "string" ? input.notes.trim().slice(0, 500) : "",
    issuedAt: status === "issued" ? new Date() : null,
    paidAt: null,
  });

  await syncJobBilling(userId, String(inv._id), jobIds, []);
  const dtos = await loadJobsForIds(userId, jobIds);
  return toDto(inv.toObject() as never, dtos);
}

export async function updateInvoiceBasket(
  userId: string,
  invoiceId: string,
  jobIdsRaw: string[]
): Promise<InvoiceDto> {
  if (!mongoose.isValidObjectId(invoiceId)) throw new Error("Invalid id");
  const uid = new mongoose.Types.ObjectId(userId);
  const inv = await Invoice.findOne({ _id: invoiceId, userId: uid });
  if (!inv) throw new Error("Not found");
  if (inv.status === "paid" || inv.status === "cancelled") {
    throw new Error("Paid/cancelled invoices cannot be edited");
  }

  const jobIds = Array.from(new Set(jobIdsRaw.map(String).filter(Boolean)));
  if (!jobIds.length) throw new Error("Select at least one project");

  const jobs = await FreelanceProject.find({
    userId: uid,
    _id: { $in: jobIds },
  }).lean();
  if (jobs.length !== jobIds.length) throw new Error("Some projects were not found");

  for (const j of jobs) {
    if ((j.clientName ?? "").trim().toLowerCase() !== inv.clientName.trim().toLowerCase()) {
      throw new Error("All projects must belong to the same client");
    }
    assertJobCanBeInvoiced(j, invoiceId);
  }

  const previous = (inv.jobIds ?? []).map((id) => String(id));
  inv.jobIds = jobIds.map((id) => new mongoose.Types.ObjectId(id)) as never;
  inv.totalEgp = await sumEgp(userId, jobIds);
  if (inv.status === "draft") {
    inv.status = "issued";
    inv.issuedAt = inv.issuedAt ?? new Date();
  }
  await inv.save();
  await syncJobBilling(userId, invoiceId, jobIds, previous);

  const dtos = await loadJobsForIds(userId, jobIds);
  return toDto(inv.toObject() as never, dtos);
}

export async function getInvoice(userId: string, invoiceId: string): Promise<InvoiceDto | null> {
  if (!mongoose.isValidObjectId(invoiceId)) return null;
  const uid = new mongoose.Types.ObjectId(userId);
  const inv = await Invoice.findOne({ _id: invoiceId, userId: uid }).lean();
  if (!inv) return null;
  const jobIds = (inv.jobIds ?? []).map((id) => String(id));
  const dtos = await loadJobsForIds(userId, jobIds);
  return toDto(inv as never, dtos);
}

export async function listOpenInvoices(userId: string, clientName?: string): Promise<InvoiceDto[]> {
  const uid = new mongoose.Types.ObjectId(userId);
  const q: Record<string, unknown> = {
    userId: uid,
    status: { $in: ["draft", "issued"] },
  };
  if (clientName?.trim()) {
    q.clientName = new RegExp(`^${clientName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
  }
  const rows = await Invoice.find(q).sort({ updatedAt: -1 }).limit(20).lean();
  const out: InvoiceDto[] = [];
  for (const inv of rows) {
    const jobIds = (inv.jobIds ?? []).map((id) => String(id));
    const dtos = await loadJobsForIds(userId, jobIds);
    out.push(toDto(inv as never, dtos));
  }
  return out;
}

export async function markInvoicePaid(userId: string, invoiceId: string): Promise<InvoiceDto> {
  if (!mongoose.isValidObjectId(invoiceId)) throw new Error("Invalid id");
  const uid = new mongoose.Types.ObjectId(userId);
  const inv = await Invoice.findOne({ _id: invoiceId, userId: uid });
  if (!inv) throw new Error("Not found");
  if (inv.status === "cancelled") throw new Error("Invoice cancelled");
  inv.status = "paid";
  inv.paidAt = new Date();
  if (!inv.issuedAt) inv.issuedAt = new Date();
  await inv.save();
  const jobIds = (inv.jobIds ?? []).map((id) => String(id));
  const dtos = await loadJobsForIds(userId, jobIds);
  return toDto(inv.toObject() as never, dtos);
}

/** Unbilled normal jobs for a client, oldest first — for flexible basket UI. */
export async function listUnbilledNormalForClient(userId: string, clientName: string) {
  const uid = new mongoose.Types.ObjectId(userId);
  const name = clientName.trim();

  const clientFilter =
    !name || name === "—" || name === "-"
      ? {
          $or: [
            { clientName: "" },
            { clientName: null },
            { clientName: { $exists: false } },
            { clientName: /^\s*$/ },
          ],
        }
      : {
          clientName: new RegExp(
            `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
            "i"
          ),
        };

  const rows = await FreelanceProject.find({
    userId: uid,
    ...clientFilter,
    ...buildProjectTypeMongoFilter("normal"),
    ...BILLABLE_JOB_FILTER,
  })
    .sort({ startDate: 1, createdAt: 1 })
    .lean();

  return Promise.all(rows.map((j) => buildProjectJobDto(j as never, userId)));
}

/** Load specific jobs by id (used by billing basket — reliable even without client name). */
export async function listUnbilledJobsByIds(userId: string, jobIds: string[]) {
  const uid = new mongoose.Types.ObjectId(userId);
  const ids = jobIds.filter((id) => mongoose.isValidObjectId(id));
  if (!ids.length) return [];

  const rows = await FreelanceProject.find({
    userId: uid,
    _id: { $in: ids },
    ...BILLABLE_JOB_FILTER,
  })
    .sort({ startDate: 1, createdAt: 1 })
    .lean();

  const byId = new Map(rows.map((r) => [String(r._id), r]));
  const ordered = ids.map((id) => byId.get(id)).filter(Boolean);
  return Promise.all(ordered.map((j) => buildProjectJobDto(j as never, userId)));
}

export async function listNormalBillingGroups(userId: string) {
  const uid = new mongoose.Types.ObjectId(userId);
  const rows = await FreelanceProject.find({
    userId: uid,
    ...BILLABLE_JOB_FILTER,
    ...buildProjectTypeMongoFilter("normal"),
  })
    .select("clientName agreedAmount")
    .sort({ startDate: 1, createdAt: 1 })
    .lean();

  const byClient = new Map<
    string,
    {
      clientName: string;
      hasClient: boolean;
      count: number;
      totalEgp: number;
      jobIds: string[];
      amounts: number[];
    }
  >();

  for (const r of rows) {
    const raw = (r.clientName ?? "").trim();
    const key = raw.toLowerCase() || "__no_client__";
    const cur = byClient.get(key) ?? {
      clientName: raw,
      hasClient: Boolean(raw),
      count: 0,
      totalEgp: 0,
      jobIds: [],
      amounts: [],
    };
    const amt = Number(r.agreedAmount) || 0;
    cur.count += 1;
    cur.totalEgp = roundMoney(cur.totalEgp + amt);
    cur.jobIds.push(String(r._id));
    cur.amounts.push(amt);
    byClient.set(key, cur);
  }

  return Array.from(byClient.values())
    .filter((g) => g.count >= 1)
    .map((g) => {
      const suggestCount = Math.min(10, g.count);
      const suggestTotalEgp = roundMoney(
        g.amounts.slice(0, suggestCount).reduce((s, a) => s + a, 0)
      );
      const samePrice =
        g.amounts.length > 0 && g.amounts.every((a) => a === g.amounts[0]);
      return {
        clientName: g.clientName,
        hasClient: g.hasClient,
        count: g.count,
        totalEgp: g.totalEgp,
        jobIds: g.jobIds,
        /** How many jobs the default basket picks (oldest first). */
        suggestCount,
        /** Sum of those suggested jobs only (not the whole pool). */
        suggestTotalEgp,
        /** True when every job in the pool has the same agreedAmount. */
        samePrice,
        unitAmount: samePrice ? g.amounts[0] : null,
      };
    })
    .sort((a, b) => b.count - a.count);
}
