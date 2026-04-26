import { describe, expect, it } from "vitest";
import {
  chartKeyForIncomeType,
  isIncomeTypeSlug,
  normalizeIncomeType,
} from "./income-types";

describe("income types", () => {
  it("isIncomeTypeSlug is true for known slugs", () => {
    expect(isIncomeTypeSlug("salary")).toBe(true);
    expect(isIncomeTypeSlug("unknown")).toBe(false);
  });

  it("normalizeIncomeType maps invalid to other", () => {
    expect(normalizeIncomeType("SALARY")).toBe("salary");
    expect(normalizeIncomeType("nope")).toBe("other");
  });

  it("chartKeyForIncomeType returns stable keys", () => {
    expect(chartKeyForIncomeType("salary")).toContain("Salary");
    expect(chartKeyForIncomeType("other")).toContain("Other");
  });
});
