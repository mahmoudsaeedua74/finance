import mongoose from "mongoose";
import { FreelanceProject, type IFreelanceProject } from "@/lib/models";
import {
  isWalletPaymentMethod,
  normalizePaymentMethod,
  type PaymentMethod,
} from "@/lib/payment-method";
import { collectProjectPayment } from "@/lib/services/project-payout-service";

export const PAYMENT_METHOD_REQUIRED_MSG =
  "حدّد طريقة التحصيل (كاش أو فيزا) في المشروع أولاً. · Set payment method (cash or card) on the project first.";

export const CANCELLATION_REASON_REQUIRED_MSG =
  "اكتب سبب الإلغاء. · Cancellation reason is required.";

export const JOB_CANCELLED_MSG =
  "المشروع ملغي — لا يمكن تنفيذ العملية. · Project is cancelled.";

export function parseCancellationReason(raw: unknown): string {
  const reason = typeof raw === "string" ? raw.trim().slice(0, 500) : "";
  if (!reason) throw new Error(CANCELLATION_REASON_REQUIRED_MSG);
  return reason;
}

export function resolveCollectPaymentMethod(
  bodyMethod: PaymentMethod | undefined,
  jobMethod: PaymentMethod
): PaymentMethod {
  const fromBody = bodyMethod && bodyMethod !== "unspecified" ? bodyMethod : undefined;
  const resolved = normalizePaymentMethod(fromBody ?? jobMethod);
  if (!isWalletPaymentMethod(resolved)) {
    throw new Error(PAYMENT_METHOD_REQUIRED_MSG);
  }
  return resolved;
}

export function assertJobNotCancelled(status: string) {
  if (status === "cancelled") throw new Error(JOB_CANCELLED_MSG);
}

export async function markWorkPhaseDelivered(
  userId: string,
  jobId: mongoose.Types.ObjectId | string
) {
  const uid = new mongoose.Types.ObjectId(userId);
  const jid =
    typeof jobId === "string" ? jobId : String(jobId);
  await FreelanceProject.updateOne(
    { _id: jid, userId: uid },
    { $set: { workPhase: "delivered" } }
  );
}

/** Collect any remaining balance when user marks the job as delivered. */
export async function autoCollectRemainingOnDelivered(
  userId: string,
  job: IFreelanceProject & { _id: mongoose.Types.ObjectId | string },
  paymentMethod: PaymentMethod,
  date: Date = new Date()
) {
  await collectProjectPayment(userId, job, {
    date,
    paymentMethod,
  });
}
