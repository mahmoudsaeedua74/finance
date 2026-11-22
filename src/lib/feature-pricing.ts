import { roundMoney } from "@/lib/currency";
import type { FeaturePricingMode } from "@/lib/models";
import type { FeaturePaymentStatus } from "@/types/feature";

export const DEFAULT_FEATURE_HOURLY_RATE_EGP = 500;
export const DEFAULT_FEATURE_MINIMUM_PRICE_EGP = 1000;

export function calculateFeatureCostEgp(billableSeconds: number, hourlyRateEgp: number) {
  return roundMoney(Math.max(0, billableSeconds) / 3600 * Math.max(0, hourlyRateEgp));
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
