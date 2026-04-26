/**
 * Income source slugs stored on {@link Income}. Shown in UI via `income.types.*`.
 */
export const INCOME_TYPES = ["salary", "freelance", "gam3eya", "other"] as const;
export type IncomeTypeSlug = (typeof INCOME_TYPES)[number];

export function isIncomeTypeSlug(s: string): s is IncomeTypeSlug {
  return (INCOME_TYPES as readonly string[]).includes(s);
}

/** Coerce API/body values into a valid slug (unknown → other). */
export function normalizeIncomeType(raw: unknown): IncomeTypeSlug {
  const s = String(raw ?? "other").trim().toLowerCase();
  return isIncomeTypeSlug(s) ? s : "other";
}

/**
 * Keys used inside `MonthlyReportDto.incomeByType` (stable for charts / PDF / filters).
 */
export const INCOME_BY_TYPE_CHART_KEYS = {
  salary: "Salary & payroll",
  freelance: "Freelance & projects (income)",
  gam3eya: "Savings circle (income)",
  other: "Other income",
  projectPayouts: "Project payouts",
} as const;

export type IncomeByTypeChartKey =
  (typeof INCOME_BY_TYPE_CHART_KEYS)[keyof typeof INCOME_BY_TYPE_CHART_KEYS];

export function chartKeyForIncomeType(incomeType: string): string {
  if (incomeType === "salary") return INCOME_BY_TYPE_CHART_KEYS.salary;
  if (incomeType === "freelance") return INCOME_BY_TYPE_CHART_KEYS.freelance;
  if (incomeType === "gam3eya") return INCOME_BY_TYPE_CHART_KEYS.gam3eya;
  return INCOME_BY_TYPE_CHART_KEYS.other;
}
