import { describe, expect, it } from "vitest";
import { derivePaymentStatus, pendingAmountForJob } from "./project-job-rules";

describe("retainer billing", () => {
  it("keeps a paid retainer open", () => {
    expect(derivePaymentStatus(13500, 13500, "retainer")).toBe("partial");
    expect(derivePaymentStatus(13500, 20000, "retainer")).toBe("partial");
    expect(derivePaymentStatus(13500, 0, "retainer")).toBe("pending");
  });

  it("still closes a fixed job when collected covers the agreement", () => {
    expect(derivePaymentStatus(13500, 13500, "fixed")).toBe("collected");
  });

  it("counts only unpaid installments as pending on a retainer", () => {
    expect(pendingAmountForJob(13500, 13500, 4000, "retainer")).toBe(4000);
    expect(pendingAmountForJob(13500, 5000, 0, "fixed")).toBe(8500);
  });
});
