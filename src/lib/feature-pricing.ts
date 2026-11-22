import { roundMoney } from "@/lib/currency";
import type { FeaturePricingMode } from "@/lib/models";
import type { FeaturePaymentStatus } from "@/types/feature";

export const DEFAULT_FEATURE_HOURLY_RATE_EGP = 500;
export const DEFAULT_FEATURE_MINIMUM_PRICE_EGP = 1000;

export function calculateFeatureCostEgp(billableSeconds: number, hourlyRateEgp: number) {
  return roundMoney(Math.max(0, billableSeconds) / 3600 * Math.max(0, hourlyRateEgp));
}

export function calculateHourlyTaskBalances(
  tasks: { id: string; billableSecondsForPayment: number }[],
  payouts: { amount: number; taskId?: string | null; isCollected: boolean }[],
  hourlyRateEgp: number,
  approvedPriceEgp: number | null,
) {
  const taskIds = new Set(tasks.map((task) => task.id));
  const alreadyAllocated = payouts.reduce((sum, payment) => sum + payment.amount, 0);
  let budget = approvedPriceEgp == null ? Infinity : Math.max(0, roundMoney(approvedPriceEgp - alreadyAllocated));
  // Older feature-level payments still cover the task work, in task order.
  let legacyCredit = payouts.reduce((sum, payment) => (
    payment.taskId && taskIds.has(payment.taskId) ? sum : sum + payment.amount
  ), 0);
  return tasks.map((task) => {
    const amountEgp = calculateFeatureCostEgp(task.billableSecondsForPayment, hourlyRateEgp);
    const linked = payouts.filter((payment) => payment.taskId === task.id);
    const collectedAmountEgp = roundMoney(linked.reduce((sum, payment) => sum + (payment.isCollected ? payment.amount : 0), 0));
    const committed = linked.reduce((sum, payment) => sum + payment.amount, 0);
    const remaining = Math.max(0, roundMoney(amountEgp - committed));
    const credit = Math.min(legacyCredit, remaining);
    legacyCredit = roundMoney(legacyCredit - credit);
    const collectableAmountEgp = Math.min(budget, roundMoney(remaining - credit));
    budget = roundMoney(budget - collectableAmountEgp);
    return { taskId: task.id, amountEgp, collectedAmountEgp, collectableAmountEgp, paymentCount: linked.length };
  });
}

export function featurePaymentStatus(
  pricingMode: FeaturePricingMode,
  approvedPriceEgp: number | null,
  collectedAmountEgp: number
): FeaturePaymentStatus {
  if (pricingMode === "free") return "not_applicable";
  if (approvedPriceEgp == null) return "pricing_pending";
  if (collectedAmountEgp <= 0.005) return "unpaid";
  if (collectedAmountEgp + 0.005 >= approvedPriceEgp) return "paid";
  return "partial";
}
