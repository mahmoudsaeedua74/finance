import mongoose from "mongoose";
import { FreelanceProject, Project } from "@/lib/models";
import type { ProjectJobDto } from "@/types/project-job";

export type ProjectAttentionKind =
  | "payment_overdue"
  | "payment_due_soon"
  | "installment_due_soon"
  | "stale_quote"
  | "delivered_unpaid"
  /** Any remaining unpaid balance (all project types). */
  | "pending_balance";

/** Payment / unpaid — excludes stale quotes. */
export const COLLECTION_ATTENTION_KINDS: ProjectAttentionKind[] = [
  "payment_overdue",
  "payment_due_soon",
  "installment_due_soon",
  "delivered_unpaid",
  "pending_balance",
];

export type ProjectAttentionScope = "collections" | "preview" | "all";

export type ProjectAttentionItem = {
  kind: ProjectAttentionKind;
  jobId: string;
  jobName: string;
  clientName: string;
  detail: string;
  amount?: number;
  date?: string;
  projectType?: string;
};

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDaysUtc(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

async function collectedMap(userId: mongoose.Types.ObjectId) {
  const payouts = await Project.find({
    userId,
    $or: [{ isCollected: true }, { isCollected: { $exists: false } }],
  })
    .select("freelanceProjectId amount")
    .lean();
  const map = new Map<string, number>();
  for (const p of payouts) {
    if (!p.freelanceProjectId) continue;
    const id = String(p.freelanceProjectId);
    map.set(id, (map.get(id) ?? 0) + p.amount);
  }
  return map;
}

export async function getProjectAttentionItems(
  userId: string,
  scope: ProjectAttentionScope = "all"
): Promise<ProjectAttentionItem[]> {
  const uid = new mongoose.Types.ObjectId(userId);
  const now = new Date();
  const today = startOfUtcDay(now);
  const weekEnd = addDaysUtc(today, 7);
  const staleQuoteBefore = addDaysUtc(today, -14);

  const [jobs, installments, colMap] = await Promise.all([
    FreelanceProject.find({
      userId: uid,
      isArchived: { $ne: true },
      status: { $nin: ["cancelled"] },
    }).lean(),
    Project.find({
      userId: uid,
      isCollected: false,
      freelanceProjectId: { $ne: null },
      date: { $gte: today, $lt: weekEnd },
    })
      .select("freelanceProjectId name amount date note")
      .lean(),
    collectedMap(uid),
  ]);

  const jobById = new Map(jobs.map((j) => [String(j._id), j]));
  const items: ProjectAttentionItem[] = [];
  const seen = new Set<string>();

  const push = (item: ProjectAttentionItem) => {
    const key = `${item.kind}-${item.jobId}-${item.date ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  for (const job of jobs) {
    const id = String(job._id);
    const collected = colMap.get(id) ?? 0;
    const pending = Math.max(0, job.agreedAmount - collected);
    const cn = job.clientName?.trim() ?? "";
    const projectType = (job.projectType as string | undefined) ?? "normal";

    if (
      job.expectedPaymentDate &&
      pending > 0.005 &&
      new Date(job.expectedPaymentDate) < today
    ) {
      push({
        kind: "payment_overdue",
        jobId: id,
        jobName: job.name,
        clientName: cn,
        detail: "expectedPaymentDate",
        amount: pending,
        date: new Date(job.expectedPaymentDate).toISOString(),
        projectType,
      });
    }

    if (
      job.expectedPaymentDate &&
      pending > 0.005 &&
      new Date(job.expectedPaymentDate) >= today &&
      new Date(job.expectedPaymentDate) < weekEnd
    ) {
      push({
        kind: "payment_due_soon",
        jobId: id,
        jobName: job.name,
        clientName: cn,
        detail: "expectedPaymentDate",
        amount: pending,
        date: new Date(job.expectedPaymentDate).toISOString(),
        projectType,
      });
    }

    if (
      job.workPhase === "quote" &&
      job.createdAt < staleQuoteBefore &&
      pending > 0.005
    ) {
      push({
        kind: "stale_quote",
        jobId: id,
        jobName: job.name,
        clientName: cn,
        detail: "quote",
        amount: pending,
        date: job.createdAt.toISOString(),
        projectType,
      });
    }

    if (job.workPhase === "delivered" && pending > 0.005) {
      push({
        kind: "delivered_unpaid",
        jobId: id,
        jobName: job.name,
        clientName: cn,
        detail: "delivered",
        amount: pending,
        projectType,
      });
    }
  }

  for (const inst of installments) {
    const job = inst.freelanceProjectId ? jobById.get(String(inst.freelanceProjectId)) : null;
    if (!job) continue;
    push({
      kind: "installment_due_soon",
      jobId: String(job._id),
      jobName: job.name,
      clientName: job.clientName?.trim() ?? "",
      detail: inst.note?.trim() || "installment",
      amount: inst.amount,
      date: new Date(inst.date).toISOString(),
      projectType: (job.projectType as string | undefined) ?? "normal",
    });
  }

  // Include EVERY unpaid job (Normal, CSS, SDK, …) — not only date-based alerts.
  const jobsWithCollectionHit = new Set(
    items
      .filter((i) =>
        (
          [
            "payment_overdue",
            "payment_due_soon",
            "installment_due_soon",
            "delivered_unpaid",
          ] as ProjectAttentionKind[]
        ).includes(i.kind)
      )
      .map((i) => i.jobId)
  );

  for (const job of jobs) {
    const id = String(job._id);
    if (jobsWithCollectionHit.has(id)) continue;
    const collected = colMap.get(id) ?? 0;
    const pending = Math.max(0, job.agreedAmount - collected);
    if (pending <= 0.005) continue;
    push({
      kind: "pending_balance",
      jobId: id,
      jobName: job.name,
      clientName: job.clientName?.trim() ?? "",
      detail: "pending",
      amount: pending,
      projectType: (job.projectType as string | undefined) ?? "normal",
    });
  }

  const order: ProjectAttentionKind[] = [
    "payment_overdue",
    "delivered_unpaid",
    "payment_due_soon",
    "installment_due_soon",
    "pending_balance",
    "stale_quote",
  ];
  items.sort((a, b) => {
    const byKind = order.indexOf(a.kind) - order.indexOf(b.kind);
    if (byKind !== 0) return byKind;
    return (b.amount ?? 0) - (a.amount ?? 0);
  });

  const filtered =
    scope === "all"
      ? items
      : items.filter((i) => COLLECTION_ATTENTION_KINDS.includes(i.kind));

  // Preview + collections pages: full unpaid list (all types).
  if (scope === "preview" || scope === "collections") {
    return filtered;
  }

  return filtered.slice(0, 12);
}

export function attentionFromJobs(jobs: ProjectJobDto[]): ProjectAttentionItem[] {
  const now = new Date();
  const today = startOfUtcDay(now);
  const weekEnd = addDaysUtc(today, 7);
  const staleQuoteBefore = addDaysUtc(today, -14);
  const items: ProjectAttentionItem[] = [];

  for (const job of jobs) {
    if (job.status === "cancelled") continue;
    const pending = job.pendingAmount;
    if (pending <= 0.005) continue;

    if (job.expectedPaymentDate && new Date(job.expectedPaymentDate) < today) {
      items.push({
        kind: "payment_overdue",
        jobId: job.id,
        jobName: job.name,
        clientName: job.clientName,
        detail: "overdue",
        amount: pending,
        date: job.expectedPaymentDate,
        projectType: job.projectType,
      });
    } else if (
      job.expectedPaymentDate &&
      new Date(job.expectedPaymentDate) >= today &&
      new Date(job.expectedPaymentDate) < weekEnd
    ) {
      items.push({
        kind: "payment_due_soon",
        jobId: job.id,
        jobName: job.name,
        clientName: job.clientName,
        detail: "soon",
        amount: pending,
        date: job.expectedPaymentDate,
        projectType: job.projectType,
      });
    }

    if (job.workPhase === "quote" && new Date(job.createdAt) < staleQuoteBefore) {
      items.push({
        kind: "stale_quote",
        jobId: job.id,
        jobName: job.name,
        clientName: job.clientName,
        detail: "quote",
        amount: pending,
        projectType: job.projectType,
      });
    }

    if (job.workPhase === "delivered" && pending > 0.005) {
      items.push({
        kind: "delivered_unpaid",
        jobId: job.id,
        jobName: job.name,
        clientName: job.clientName,
        detail: "delivered",
        amount: pending,
        projectType: job.projectType,
      });
    }

    for (const p of job.payouts) {
      if (p.isCollected) continue;
      const due = new Date(p.date);
      if (due >= today && due < weekEnd) {
        items.push({
          kind: "installment_due_soon",
          jobId: job.id,
          jobName: job.name,
          clientName: job.clientName,
          detail: p.note || "installment",
          amount: p.amount,
          date: p.date,
          projectType: job.projectType,
        });
      }
    }
  }

  const hit = new Set(
    items.filter((i) => i.kind !== "stale_quote").map((i) => i.jobId)
  );
  for (const job of jobs) {
    if (job.status === "cancelled" || hit.has(job.id)) continue;
    if (job.pendingAmount <= 0.005) continue;
    items.push({
      kind: "pending_balance",
      jobId: job.id,
      jobName: job.name,
      clientName: job.clientName,
      detail: "pending",
      amount: job.pendingAmount,
      projectType: job.projectType,
    });
  }

  return items;
}
