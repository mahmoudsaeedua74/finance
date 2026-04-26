import { describe, it, expect } from "vitest";
import { sumRecurringThroughDate } from "./lifetime-ledger";

describe("sumRecurringThroughDate", () => {
  it("counts one month when rule starts mid-month and asOf is same month", () => {
    const asOf = new Date("2026-05-30T12:00:00.000Z");
    const total = sumRecurringThroughDate(
      [
        {
          amount: 100,
          validFrom: new Date("2026-05-29T00:00:00.000Z"),
          validTo: null,
        },
      ],
      asOf
    );
    expect(total).toBe(100);
  });

  it("excludes months before validFrom", () => {
    const asOf = new Date("2026-04-30T12:00:00.000Z");
    const total = sumRecurringThroughDate(
      [
        {
          amount: 100,
          validFrom: new Date("2026-05-29T00:00:00.000Z"),
          validTo: null,
        },
      ],
      asOf
    );
    expect(total).toBe(0);
  });
});
