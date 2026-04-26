import { startOfMonth } from "date-fns";
import { Expense, Income, Project, type IExpense } from "@/lib/models";
import {
  expenseNonTemplateInMonth,
  expenseTemplatesApplyingInMonth,
  incomeInMonth,
  monthDateBoundsUTC,
  projectPayoutInMonth,
} from "@/lib/db-month-filters";
import { addToMap, topEntry } from "@/lib/monthly";
import { chartKeyForIncomeType, INCOME_BY_TYPE_CHART_KEYS } from "@/lib/income-types";
import { buildSmartInsights } from "@/lib/services/insight-service";

export type MonthlyReportData = Awaited<ReturnType<typeof buildMonthlyReport>>;

export async function buildMonthlyReport(year: number, month: number, userId: string) {
  const { mStart, mEnd } = monthDateBoundsUTC(year, month);
  const nq = expenseNonTemplateInMonth(userId, mStart, mEnd);
  const tq = expenseTemplatesApplyingInMonth(userId, mStart, mEnd);
  const [incomeRows, projectRows, expNon, expTpl, smartInsights] = await Promise.all([
    Income.find(incomeInMonth(userId, mStart, mEnd)).lean(),
    Project.find(projectPayoutInMonth(userId, mStart, mEnd)).lean(),
    Expense.find(nq).lean(),
    Expense.find(tq).lean(),
    buildSmartInsights(userId, year, month),
  ]);
  const expenses = [
    ...((expNon as IExpense[]) ?? []),
    ...((expTpl as IExpense[]) ?? []),
  ];

  let totalIncomeFromIncomes = 0;
  let salaryIncome = 0;
  const incomeByType: Record<string, number> = {};
  for (const i of incomeRows) {
    totalIncomeFromIncomes += i.amount;
    if (i.incomeType === "salary") salaryIncome += i.amount;
    const key = chartKeyForIncomeType(i.incomeType);
    addToMap(incomeByType, key, i.amount);
  }

  const projectTotal = projectRows.reduce((s, p) => s + p.amount, 0);
  addToMap(incomeByType, INCOME_BY_TYPE_CHART_KEYS.projectPayouts, projectTotal);

  const totalIncome = totalIncomeFromIncomes + projectTotal;

  const expenseByCategory: Record<string, number> = {};
  let totalExpenses = 0;
  const expenseLineItems: {
    _id: string;
    title: string;
    amount: number;
    date: Date;
    category: string;
    source: "variable" | "recurring" | "fixed_once";
    projectName?: string;
  }[] = [];

  for (const e of expenses) {
    if (e.isTemplate && e.recurring) {
      totalExpenses += e.amount;
      addToMap(expenseByCategory, e.category, e.amount);
      expenseLineItems.push({
        _id: String(e._id),
        title: e.title,
        amount: e.amount,
        date: startOfMonth(new Date(year, month - 1, 1)),
        category: e.category,
        source: "recurring",
        projectName: e.projectName?.trim() || undefined,
      });
    } else if (!e.isTemplate) {
      totalExpenses += e.amount;
      addToMap(expenseByCategory, e.category, e.amount);
      expenseLineItems.push({
        _id: String(e._id),
        title: e.title,
        amount: e.amount,
        date: e.date,
        category: e.category,
        source: e.kind === "fixed" ? "fixed_once" : "variable",
        projectName: e.projectName?.trim() || undefined,
      });
    }
  }

  const net = totalIncome - totalExpenses;
  const topCat = topEntry(expenseByCategory);
  /** If there is any salary in the month, use it as the "what matters" baseline (excludes جمعية / freelance). */
  const basisIncome = salaryIncome > 0 ? salaryIncome : totalIncome;
  const insights = {
    overspent: totalExpenses > basisIncome,
    biggestExpenseCategory: topCat
      ? { name: topCat.key, amount: topCat.value }
      : null,
    moneyLeft: basisIncome - totalExpenses,
  };

  return {
    year,
    month,
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
      date: i.date,
      incomeType: i.incomeType,
    })),
    projectLineItems: projectRows.map((p) => ({
      _id: String(p._id),
      name: p.name,
      amount: p.amount,
      date: p.date,
      ...(p.note?.trim() ? { note: p.note.trim() } : {}),
    })),
    expenseLineItems: expenseLineItems.map((r) => ({
      _id: r._id,
      title: r.title,
      amount: r.amount,
      date: r.date,
      category: r.category,
      source: r.source,
      ...(r.projectName ? { projectName: r.projectName } : {}),
    })),
    insights,
    smartInsights,
  };
}
