import { describe, expect, it } from "vitest";
import { isDateInMonth, monthWindow, templateAppliesInMonth } from "./monthly";

describe("templateAppliesInMonth", () => {
  it("is false when validFrom is after the month", () => {
    expect(
      templateAppliesInMonth(new Date(2024, 5, 1), null, 2024, 3)
    ).toBe(false);
  });

  it("is true for open-ended template starting before the month", () => {
    expect(
      templateAppliesInMonth(new Date(2020, 0, 1), null, 2024, 3)
    ).toBe(true);
  });

  it("is false when validTo is before the month", () => {
    expect(
      templateAppliesInMonth(new Date(2023, 0, 1), new Date(2024, 1, 1), 2024, 3)
    ).toBe(false);
  });

  it("is true when the month is inside [validFrom, validTo]", () => {
    expect(
      templateAppliesInMonth(
        new Date(2024, 1, 1),
        new Date(2024, 5, 1),
        2024,
        3
      )
    ).toBe(true);
  });
});

describe("isDateInMonth", () => {
  it("matches monthWindow for a mid-month date", () => {
    const d = new Date(2024, 2, 15);
    const { start, end } = monthWindow(2024, 3);
    expect(d >= start && d <= end).toBe(true);
    expect(isDateInMonth(d, 2024, 3)).toBe(true);
  });
});
