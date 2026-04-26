import { describe, it, expect } from "vitest";
import { effectiveDueDayInMonth } from "./due-day-of-month";

describe("effectiveDueDayInMonth", () => {
  it("clamps 30 in February 2026 to 28", () => {
    expect(effectiveDueDayInMonth(30, 2026, 2)).toBe(28);
  });
  it("keeps 10 in April", () => {
    expect(effectiveDueDayInMonth(10, 2026, 4)).toBe(10);
  });
});
