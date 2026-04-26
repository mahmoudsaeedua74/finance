import { describe, it, expect } from "vitest";
import { addOneCivilDay, effectiveDueDayInMonth } from "./due-day-of-month";

describe("effectiveDueDayInMonth", () => {
  it("clamps 30 in February 2026 to 28", () => {
    expect(effectiveDueDayInMonth(30, 2026, 2)).toBe(28);
  });
  it("keeps 10 in April", () => {
    expect(effectiveDueDayInMonth(10, 2026, 4)).toBe(10);
  });
});

describe("addOneCivilDay", () => {
  it("steps within month", () => {
    expect(addOneCivilDay(2026, 4, 9)).toEqual({ y: 2026, m: 4, d: 10 });
  });
  it("rolls to next month", () => {
    expect(addOneCivilDay(2026, 4, 30)).toEqual({ y: 2026, m: 5, d: 1 });
  });
  it("rolls year on Dec 31", () => {
    expect(addOneCivilDay(2026, 12, 31)).toEqual({ y: 2027, m: 1, d: 1 });
  });
});
