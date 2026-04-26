import { describe, expect, it } from "vitest";
import { isPresetExpenseCategory, resolveExpenseCategoryForSave } from "./expense-categories";

describe("expense-categories", () => {
  it("isPresetExpenseCategory is true for known slugs", () => {
    expect(isPresetExpenseCategory("food")).toBe(true);
    expect(isPresetExpenseCategory("x-custom")).toBe(false);
  });

  it("resolveExpenseCategoryForSave falls back to general", () => {
    expect(resolveExpenseCategoryForSave("")).toBe("general");
    expect(resolveExpenseCategoryForSave("  custom  ")).toBe("custom");
  });
});
