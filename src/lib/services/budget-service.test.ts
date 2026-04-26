import { describe, expect, it } from "vitest";
import { budgetStatus, monthKeyOf } from "./budget-service";

describe("budgetService", () => {
  it("monthKeyOf matches YYYY-MM", () => {
    expect(monthKeyOf(2024, 3)).toBe("2024-03");
  });

  it("budgetStatus buckets by percent", () => {
    expect(budgetStatus(50)).toBe("safe");
    expect(budgetStatus(75)).toBe("warning");
    expect(budgetStatus(100)).toBe("over");
  });
});
