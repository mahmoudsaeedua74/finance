import type { MonthlyReportDto } from "@/types/report";
import {
  EXPENSE_CATEGORY_PRESETS,
  isPresetExpenseCategory,
} from "./expense-categories";

export type ReportFilterState = {
  expenseCategory: string;
  projectId: string;
  search: string;
};

/** All preset slugs, then any extra category strings that appear this month (legacy / custom). */
export function getReportCategorySelectOptions(
  monthUniqueCategories: string[]
): string[] {
  const fromMonth = new Set(monthUniqueCategories);
  const extra = Array.from(fromMonth)
    .filter((c) => !isPresetExpenseCategory(c))
    .sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  return [...EXPENSE_CATEGORY_PRESETS, ...extra];
}

function matchesSearch(q: string, ...parts: string[]) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return parts.some((p) => p.toLowerCase().includes(s));
}

/**
 * Subset the monthly report and recompute summary + breakdowns.
 */
export function applyReportFilters(
  r: MonthlyReportDto,
  f: ReportFilterState
): MonthlyReportDto {
  let inc = [...r.incomeLineItems];
  let proj = [...r.projectLineItems];
  let exp = [...r.expenseLineItems];

  if (f.projectId && f.projectId !== "all") {
    inc = [];
    proj = proj.filter((p) => p._id === f.projectId);
  }
  if (f.expenseCategory && f.expenseCategory !== "all") {
    exp = exp.filter((e) => e.category === f.expenseCategory);
  }
  if (f.search.trim()) {
    const q = f.search;
    inc = inc.filter((i) => matchesSearch(q, i.title, i.incomeType));
    proj = proj.filter((p) => matchesSearch(q, p.name));
    exp = exp.filter((e) => matchesSearch(q, e.title, e.category, e.source));
  }

  const totalIncomeFromIncomes = inc.reduce((s, i) => s + i.amount, 0);
  const projectIncome = proj.reduce((s, p) => s + p.amount, 0);
  const totalIncome = totalIncomeFromIncomes + projectIncome;
  const totalExpenses = exp.reduce((s, e) => s + e.amount, 0);
  const net = totalIncome - totalExpenses;

  const incomeByType: Record<string, number> = {};
  for (const i of inc) {
    const key =
      i.incomeType === "salary"
        ? "Salary & payroll"
        : i.incomeType === "freelance"
          ? "Freelance & projects (income)"
          : "Other income";
    incomeByType[key] = (incomeByType[key] || 0) + i.amount;
  }
  if (projectIncome > 0) {
    incomeByType["Project payouts"] = (incomeByType["Project payouts"] || 0) + projectIncome;
  }

  const expenseByCategory: Record<string, number> = {};
  for (const e of exp) {
    expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + e.amount;
  }

  const top = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])[0];
  return {
    ...r,
    summary: {
      totalIncome,
      totalExpenses,
      netBalance: net,
      totalIncomeFromIncomes,
      projectIncome,
    },
    incomeByType,
    expenseByCategory,
    incomeLineItems: inc,
    projectLineItems: proj,
    expenseLineItems: exp,
    insights: {
      overspent: totalExpenses > totalIncome,
      biggestExpenseCategory: top
        ? { name: top[0], amount: top[1] }
        : null,
      moneyLeft: net,
    },
  };
}

export function getUniqueExpenseCategories(r: MonthlyReportDto): string[] {
  return Array.from(
    new Set(r.expenseLineItems.map((e) => e.category).filter(Boolean))
  ).sort();
}

export function getDefaultReportFilters(): ReportFilterState {
  return {
    expenseCategory: "all",
    projectId: "all",
    search: "",
  };
}

export function isReportFilterDefault(f: ReportFilterState): boolean {
  return (
    f.expenseCategory === "all" && f.projectId === "all" && !f.search.trim()
  );
}
