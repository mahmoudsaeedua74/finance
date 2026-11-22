import { describe, expect, it } from "vitest";
import {
  calculateFeatureCostEgp,
  DEFAULT_FEATURE_HOURLY_RATE_EGP,
  featurePaymentStatus,
} from "@/lib/feature-pricing";

describe("feature pricing", () => {
  it("calculates billable time using the historical hourly rate", () => {
    expect(DEFAULT_FEATURE_HOURLY_RATE_EGP).toBe(500);
    expect(calculateFeatureCostEgp(5 * 60 * 60, DEFAULT_FEATURE_HOURLY_RATE_EGP)).toBe(2500);
  });

  it("does not turn free or unapproved work into a payment status", () => {
    expect(featurePaymentStatus("free", 0, 0)).toBe("not_applicable");
    expect(featurePaymentStatus("pricing_pending", null, 0)).toBe("pricing_pending");
    expect(featurePaymentStatus("fixed", 3000, 0)).toBe("unpaid");
    expect(featurePaymentStatus("fixed", 3000, 1500)).toBe("partial");
    expect(featurePaymentStatus("fixed", 3000, 3000)).toBe("paid");
  });
});
