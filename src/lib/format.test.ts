import { describe, expect, it } from "vitest";
import { formatMoney, monthLabel, shortMonthLabel } from "./format";

describe("format", () => {
  it("formatMoney is non-empty for finite numbers", () => {
    expect(formatMoney(0).length).toBeGreaterThan(0);
    expect(formatMoney(1234.5).length).toBeGreaterThan(0);
  });

  it("monthLabel includes year", () => {
    const s = monthLabel(2026, 4, "en");
    expect(s).toMatch(/2026/);
  });

  it("shortMonthLabel is compact", () => {
    const s = shortMonthLabel(2026, 1, "en");
    expect(s.length).toBeLessThan(20);
  });
});
