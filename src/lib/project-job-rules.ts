import type { FreelanceProjectStatus } from "@/lib/models/FreelanceProject";
import { normalizeWorkPhase, type WorkPhase } from "@/lib/project-work-phase";
import type { ProjectJobDto } from "@/types/project-job";

export function derivePaymentStatus(
  agreed: number,
  collected: number
): FreelanceProjectStatus {
  if (collected <= 0) return "pending";
  if (collected + 0.005 >= agreed) return "collected";
  return "partial";
}

/** Work phase shown in UI — fully paid jobs are always delivered. */
export function effectiveWorkPhase(
  storedPhase: unknown,
  agreed: number,
  collected: number
): WorkPhase {
  if (derivePaymentStatus(agreed, collected) === "collected") return "delivered";
  return normalizeWorkPhase(storedPhase);
}

export function canDeleteProjectJob(
  job: Pick<ProjectJobDto, "collectedAmount" | "status" | "cancellationReason">
): boolean {
  if (job.status === "cancelled") return false;
  return job.collectedAmount <= 0.005;
}

export const DELETE_HAS_COLLECTION_MSG =
  "لا يمكن حذف مشروع فيه تحصيل — ألغِ التحصيل أولاً أو أرشفه. · Cannot delete a project with collected payments.";
