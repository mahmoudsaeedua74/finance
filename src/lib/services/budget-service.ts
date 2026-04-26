import { toYearMonthString } from "@/lib/monthly";

export type BudgetUsageStatus = "safe" | "warning" | "over";

export function budgetStatus(pct: number): BudgetUsageStatus {
  if (pct >= 100) return "over";
  if (pct >= 70) return "warning";
  return "safe";
}

export function monthKeyOf(year: number, month: number): string {
  return toYearMonthString(year, month);
}
