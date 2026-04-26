import { startOfMonth } from "date-fns";
import { Expense, Income, Project } from "@/lib/models";
import {
  addToMap,
  isDateInMonth,
  templateAppliesInMonth,
  topEntry,
} from "@/lib/monthly";
import { getBudgetUsage } from "@/lib/services/budget-usage-service";
import { buildSmartInsights } from "@/lib/services/insight-service";

export type MonthlyReportData = Awaited<ReturnType<typeof buildMonthlyReport>>;

export async function buildMonthlyReport(year: number, month: number, userId: string) {
  const [incomes, projects, expenses, budgetUsage, smartInsights] = await Promise.all([
    Income.find({ userId }).lean(),
    Project.find({ userId }).lean(),
    Expense.find({ userId }).lean(),
    getBudgetUsage(userId, year, month),
    buildSmartInsights(userId, year, month),
  ]);

  const incomeRows = incomes.filter((i) =>
    isDateInMonth(new Date(i.date), year, month)
  );
  const projectRows = projects.filter((p) =>
    isDateInMonth(new Date(p.date), year, month)
  );

  let totalIncomeFromIncomes = 0;
  const incomeByType: Record<string, number> = {};
  for (const i of incomeRows) {
    totalIncomeFromIncomes += i.amount;
    const key =
      i.incomeType === "salary"
        ? "Salary & payroll"
        : i.incomeType === "freelance"
          ? "Freelance & projects (income)"
          : "Other income";
    addToMap(incomeByType, key, i.amount);
  }

  const projectTotal = projectRows.reduce((s, p) => s + p.amount, 0);
  addToMap(incomeByType, "Project payouts", projectTotal);

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
  }[] = [];

  for (const e of expenses) {
    if (e.isTemplate && e.recurring) {
      if (!templateAppliesInMonth(new Date(e.validFrom), e.validTo, year, month)) {
        continue;
      }
      totalExpenses += e.amount;
      addToMap(expenseByCategory, e.category, e.amount);
      expenseLineItems.push({
        _id: String(e._id),
        title: e.title,
        amount: e.amount,
        date: startOfMonth(new Date(year, month - 1, 1)),
        category: e.category,
        source: "recurring",
      });
    } else if (!e.isTemplate) {
      if (isDateInMonth(new Date(e.date), year, month)) {
        totalExpenses += e.amount;
        addToMap(expenseByCategory, e.category, e.amount);
        expenseLineItems.push({
          _id: String(e._id),
          title: e.title,
          amount: e.amount,
          date: e.date,
          category: e.category,
          source: e.kind === "fixed" ? "fixed_once" : "variable",
        });
      }
    }
  }

  const net = totalIncome - totalExpenses;
  const topCat = topEntry(expenseByCategory);
  const insights = {
    overspent: totalExpenses > totalIncome,
    biggestExpenseCategory: topCat
      ? { name: topCat.key, amount: topCat.value }
      : null,
    moneyLeft: net,
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
    })),
    expenseLineItems: expenseLineItems.map((r) => ({
      _id: r._id,
      title: r.title,
      amount: r.amount,
      date: r.date,
      category: r.category,
      source: r.source,
    })),
    insights,
    budgetUsage: budgetUsage.rows,
    smartInsights,
  };
}
