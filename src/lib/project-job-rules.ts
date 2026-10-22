import { isRetainerMode } from "@/lib/billing-mode";
import type { FreelanceProjectStatus } from "@/lib/models/FreelanceProject";
import { normalizeWorkPhase, type WorkPhase } from "@/lib/project-work-phase";
import type { ProjectJobDto } from "@/types/project-job";

export function derivePaymentStatus(
  agreed: number,
  collected: number,
  billingMode?: unknown
): FreelanceProjectStatus {
  if (isRetainerMode(billingMode)) {
    if (collected <= 0) return "pending";
    return "partial";
  }
  if (collected <= 0) return "pending";
  if (collected + 0.005 >= agreed) return "collected";
  return "partial";
}

/** Work phase shown in UI — fully paid fixed jobs are always delivered. */
export function effectiveWorkPhase(
  storedPhase: unknown,
  agreed: number,
  collected: number,
  billingMode?: unknown
): WorkPhase {
  if (!isRetainerMode(billingMode) && derivePaymentStatus(agreed, collected) === "collected") {
    return "delivered";
  }
  return normalizeWorkPhase(storedPhase);
}

/** Fixed jobs: agreed − collected. Retainer jobs: sum of installments not yet collected. */
export function pendingAmountForJob(
  agreed: number,
  collected: number,
  uncollectedInstallments: number,
  billingMode?: unknown
): number {
  if (isRetainerMode(billingMode)) return Math.max(0, uncollectedInstallments);
  return Math.max(0, agreed - collected);
}

export function canDeleteProjectJob(
  job: Pick<ProjectJobDto, "collectedAmount" | "status" | "cancellationReason">
): boolean {
  if (job.status === "cancelled") return false;
  return job.collectedAmount <= 0.005;
}

export const DELETE_HAS_COLLECTION_MSG =
  "لا يمكن حذف مشروع فيه تحصيل — ألغِ التحصيل أولاً أو أرشفه. · Cannot delete a project with collected payments.";
