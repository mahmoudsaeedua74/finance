import type mongoose from "mongoose";
import { Expense, Income, Project } from "@/lib/models";
import { projectCollectedFilter } from "@/lib/db-month-filters";
import { addToMap, topEntry } from "@/lib/monthly";
import { chartKeyForIncomeType, INCOME_BY_TYPE_CHART_KEYS } from "@/lib/income-types";
import { sumRecurringThroughDate } from "@/lib/lifetime-ledger";
import type { MonthlyReportDto } from "@/types/report";
import { buildSmartInsights } from "@/lib/services/insight-service";

type ObjId = string | mongoose.Types.ObjectId;

/**
 * All-time (cashflow-style) totals + category splits for the dashboard home view.
 * Recurring: each template is counted once per month it applies, from validFrom to today (or validTo).
 */
export async function buildLedgerReport(userId: ObjId) {
  const asOf = new Date();
  const [incomeRows, projectRows, expNon, templates] = await Promise.all([
    Income.find({ userId }).lean(),
    Project.find(projectCollectedFilter(String(userId))).lean(),
    Expense.find({ userId, isTemplate: false }).lean(),
    Expense.find({ userId, isTemplate: true, recurring: true }).lean(),
  ]);

  const incomeByType: Record<string, number> = {};
  let totalIncomeFromIncomes = 0;
  let salaryIncomeAllTime = 0;
  for (const i of incomeRows) {
    totalIncomeFromIncomes += i.amount;
    if (i.incomeType === "salary") salaryIncomeAllTime += i.amount;
    const key = chartKeyForIncomeType(i.incomeType);
    addToMap(incomeByType, key, i.amount);
  }

  const projectTotal = projectRows.reduce((s, p) => s + p.amount, 0);
  addToMap(incomeByType, INCOME_BY_TYPE_CHART_KEYS.projectPayouts, projectTotal);
  const totalIncome = totalIncomeFromIncomes + projectTotal;

  const expenseByCategory: Record<string, number> = {};
  let oneOffTotal = 0;
  for (const e of expNon) {
    oneOffTotal += e.amount;
    addToMap(expenseByCategory, e.category, e.amount);
  }

  const recurringTotal = sumRecurringThroughDate(
    templates.map((t) => ({
      amount: t.amount,
      validFrom: t.validFrom,
      validTo: t.validTo,
    })),
    asOf
  );
  for (const t of templates) {
    const perTemplate = sumRecurringThroughDate(
      [{ amount: t.amount, validFrom: t.validFrom, validTo: t.validTo }],
      asOf
    );
    if (perTemplate > 0) {
      addToMap(expenseByCategory, t.category, perTemplate);
    }
  }

  const totalExpenses = oneOffTotal + recurringTotal;
  const net = totalIncome - totalExpenses;
  const topCat = topEntry(expenseByCategory);

  const d = new Date();
  const yNow = d.getFullYear();
  const mNow = d.getMonth() + 1;

  const smartInsights = await buildSmartInsights(String(userId), yNow, mNow);
  const basisIncome = salaryIncomeAllTime > 0 ? salaryIncomeAllTime : totalIncome;
  const netFromBasis = basisIncome - totalExpenses;

  const projectLineItems = projectRows.map((p) => ({
    _id: String(p._id),
    name: p.name,
    amount: p.amount,
    date: p.date,
    ...(p.note?.trim() ? { note: p.note.trim() } : {}),
  }));
  const expenseLineItems: NonNullable<MonthlyReportDto["expenseLineItems"]> = [
    ...expNon.map((e) => ({
      _id: String(e._id),
      title: e.title,
      amount: e.amount,
      date: new Date(e.date).toISOString(),
      category: e.category,
      source: (e.kind === "fixed" ? "fixed_once" : "variable") as "variable" | "fixed_once",
      projectName: e.projectName?.trim() || undefined,
    })),
    ...templates.map((e) => ({
      _id: String(e._id),
      title: e.title,
      amount: sumRecurringThroughDate(
        [
          {
            amount: e.amount,
            validFrom: e.validFrom,
            validTo: e.validTo,
          },
        ],
        asOf
      ),
      date: new Date(e.validFrom).toISOString(),
      category: e.category,
      source: "recurring" as const,
      projectName: e.projectName?.trim() || undefined,
    })),
  ];

  const report: MonthlyReportDto = {
    year: 0,
    month: 0,
    summary: {
      totalIncome,
      totalExpenses,
      netBalance: net,
      totalIncomeFromIncomes,
      projectIncome: projectTotal,
      salaryIncomeAllTime,
    },
    incomeByType,
    expenseByCategory,
    incomeLineItems: incomeRows.map((i) => ({
      _id: String(i._id),
      title: i.title,
      amount: i.amount,
      date: new Date(i.date).toISOString(),
      incomeType: i.incomeType,
    })),
    projectLineItems: projectLineItems.map((p) => ({
      _id: p._id,
      name: p.name,
      amount: p.amount,
      date: new Date(p.date).toISOString(),
      ...(p.note ? { note: p.note } : {}),
    })),
    expenseLineItems,
    insights: {
      overspent: totalExpenses > basisIncome,
      biggestExpenseCategory: topCat
        ? { name: topCat.key, amount: topCat.value }
        : null,
      moneyLeft: netFromBasis,
    },
    smartInsights,
  };
  return report;
}
