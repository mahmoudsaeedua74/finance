import { describe, expect, it } from "vitest";
import { expenseTemplatesApplyingInMonth, monthDateBoundsUTC } from "./db-month-filters";
import { templateAppliesInMonth } from "./monthly";

/**
 * Same overlap rule as the Mongo filter in `expenseTemplatesApplyingInMonth`
 * (validFrom <= mEnd) AND (validTo == null OR validTo >= mStart).
 */
function matchesMongoOverlap(
  validFrom: Date,
  validTo: Date | null,
  mStart: Date,
  mEnd: Date
) {
  if (validFrom.getTime() > mEnd.getTime()) return false;
  if (validTo != null && validTo.getTime() < mStart.getTime()) return false;
  return true;
}

describe("expense month filters", () => {
  it("exposes a Mongo template filter for the given user", () => {
    const { mStart, mEnd } = monthDateBoundsUTC(2024, 6);
    const q = expenseTemplatesApplyingInMonth("64b0a1a1a1a1a1a1a1a1a1a1", mStart, mEnd);
    expect(q.isTemplate).toBe(true);
    expect(q.recurring).toBe(true);
    expect(q.$or).toBeDefined();
  });

  it("keeps templateAppliesInMonth aligned with Mongo overlap semantics", () => {
    const samples: { y: number; m: number; vf: Date; vt: Date | null }[] = [
      { y: 2024, m: 3, vf: new Date(2024, 2, 1), vt: null },
      { y: 2024, m: 1, vf: new Date(2023, 11, 1), vt: new Date(2024, 0, 15) },
      { y: 2024, m: 6, vf: new Date(2024, 5, 1), vt: new Date(2024, 7, 1) },
      { y: 2024, m: 2, vf: new Date(2024, 2, 1), vt: new Date(2024, 2, 28) },
    ];
    for (const { y, m, vf, vt } of samples) {
      const { mStart, mEnd } = monthDateBoundsUTC(y, m);
      expect(templateAppliesInMonth(vf, vt, y, m)).toBe(
        matchesMongoOverlap(vf, vt, mStart, mEnd)
      );
    }
  });
});
