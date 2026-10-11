import { startOfMonth } from "date-fns";
import { Expense, Income, Project, type IExpense } from "@/lib/models";
import {
  expenseTemplatesApplyingInMonth,
  monthDateBoundsUTC,
  projectCollectedFilter,
} from "@/lib/db-month-filters";
import { addToMap, topEntry } from "@/lib/monthly";
import { chartKeyForIncomeType, INCOME_BY_TYPE_CHART_KEYS } from "@/lib/income-types";
import type { MonthlyReportDto } from "@/types/report";

/**
 * One year report in a handful of queries (not 12× monthly builds).
 */
export async function buildYearlyReport(
  year: number,
  userId: string
): Promise<MonthlyReportDto> {
  const { mStart: yStart } = monthDateBoundsUTC(year, 1);
  const { mEnd: yEnd } = monthDateBoundsUTC(year, 12);
  const { mStart: janStart } = monthDateBoundsUTC(year, 1);
  const { mEnd: decEnd } = monthDateBoundsUTC(year, 12);

  const collectedFilter = projectCollectedFilter(userId);

  const [incomeRows, projectRows, expNon, expTpl] = await Promise.all([
    Income.find({ userId, date: { $gte: yStart, $lte: yEnd } })
      .select("title amount date incomeType")
      .lean(),
    Project.find({
      ...collectedFilter,
      date: { $gte: yStart, $lte: yEnd },
    })
      .select("name amount date note")
      .lean(),
    Expense.find({
      userId,
      isTemplate: false,
      date: { $gte: yStart, $lte: yEnd },
    })
      .select("title amount date category kind projectName isTemplate recurring")
      .lean(),
    // Templates that overlap any month in the year
    Expense.find(
      expenseTemplatesApplyingInMonth(userId, janStart, decEnd)
    )
      .select("title amount category projectName validFrom validTo isTemplate recurring kind")
      .lean(),
  ]);

  const incomeByType: Record<string, number> = {};
  let totalIncomeFromIncomes = 0;
  let salaryIncome = 0;
  for (const i of incomeRows) {
    totalIncomeFromIncomes += i.amount;
    if (i.incomeType === "salary") salaryIncome += i.amount;
    addToMap(incomeByType, chartKeyForIncomeType(i.incomeType), i.amount);
  }

  const projectTotal = projectRows.reduce((s, p) => s + p.amount, 0);
  addToMap(incomeByType, INCOME_BY_TYPE_CHART_KEYS.projectPayouts, projectTotal);
  const totalIncome = totalIncomeFromIncomes + projectTotal;

  const expenseByCategory: Record<string, number> = {};
  let totalExpenses = 0;
  const expenseLineItems: NonNullable<MonthlyReportDto["expenseLineItems"]> = [];

  for (const e of expNon as IExpense[]) {
    totalExpenses += e.amount;
    addToMap(expenseByCategory, e.category, e.amount);
    expenseLineItems.push({
      _id: String(e._id),
      title: e.title,
      amount: e.amount,
      date: e.date instanceof Date ? e.date.toISOString() : String(e.date),
      category: e.category,
      source: e.kind === "fixed" ? "fixed_once" : "variable",
      ...(e.projectName?.trim() ? { projectName: e.projectName.trim() } : {}),
    });
  }

  // Count each recurring template once per calendar month it applies in the year
  for (const e of expTpl as IExpense[]) {
    if (!e.isTemplate || !e.recurring) continue;
    for (let month = 1; month <= 12; month++) {
      const { mStart, mEnd } = monthDateBoundsUTC(year, month);
      const from = e.validFrom ? new Date(e.validFrom) : null;
      const to = e.validTo ? new Date(e.validTo) : null;
      if (from && from > mEnd) continue;
      if (to && to < mStart) continue;
      totalExpenses += e.amount;
      addToMap(expenseByCategory, e.category, e.amount);
      expenseLineItems.push({
        _id: `${String(e._id)}-${month}`,
        title: e.title,
        amount: e.amount,
        date: startOfMonth(new Date(year, month - 1, 1)).toISOString(),
        category: e.category,
        source: "recurring",
        ...(e.projectName?.trim() ? { projectName: e.projectName.trim() } : {}),
      });
    }
  }

  const net = totalIncome - totalExpenses;
  const topCat = topEntry(expenseByCategory);
  const basisIncome = salaryIncome > 0 ? salaryIncome : totalIncome;

  return {
    year,
    month: 0,
    summary: {
      totalIncome,
      totalExpenses,
      netBalance: net,
      totalIncomeFromIncomes,
      projectIncome: projectTotal,
      salaryIncome,
    },
    incomeByType,
    expenseByCategory,
    incomeLineItems: incomeRows.map((i) => ({
      _id: String(i._id),
      title: i.title,
      amount: i.amount,
      date: i.date instanceof Date ? i.date.toISOString() : String(i.date),
      incomeType: i.incomeType,
    })),
    projectLineItems: projectRows.map((p) => ({
      _id: String(p._id),
      name: p.name,
      amount: p.amount,
      date: p.date instanceof Date ? p.date.toISOString() : String(p.date),
      ...(p.note?.trim() ? { note: p.note.trim() } : {}),
    })),
    expenseLineItems,
    insights: {
      overspent: totalExpenses > basisIncome,
      biggestExpenseCategory: topCat
        ? { name: topCat.key, amount: topCat.value }
        : null,
      moneyLeft: basisIncome - totalExpenses,
    },
    smartInsights: [],
  };
}
