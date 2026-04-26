import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { Expense, Income, Project, RecurringIncomeTemplate } from "@/lib/models";

export async function forecastNextMonth(userId: string, year: number, month: number) {
  const targetStart = startOfMonth(new Date(year, month - 1, 1));
  const targetEnd = endOfMonth(targetStart);

  const recurringExpenses = await Expense.find({
    userId,
    isTemplate: true,
    recurring: true,
    validFrom: { $lte: targetEnd },
    $or: [{ validTo: null }, { validTo: { $gte: targetStart } }],
  }).lean();
  const recurringExpenseTotal = recurringExpenses.reduce((s, r) => s + r.amount, 0);

  const recurringIncomeTemplates = await RecurringIncomeTemplate.find({
    userId,
    active: true,
    startDate: { $lte: targetEnd },
    $or: [{ endDate: null }, { endDate: { $gte: targetStart } }],
  }).lean();
  const recurringIncomeTotal = recurringIncomeTemplates.reduce((s, r) => s + r.amount, 0);

  const from3 = startOfMonth(subMonths(targetStart, 3));
  const variableRows = await Expense.find({
    userId,
    isTemplate: false,
    kind: "variable",
    date: { $gte: from3, $lt: targetStart },
  }).lean();
  const avgVariableSpend = variableRows.reduce((s, r) => s + r.amount, 0) / 3;

  const incomeRows = await Income.find({ userId, date: { $gte: from3, $lt: targetStart } }).lean();
  const projectRows = await Project.find({ userId, date: { $gte: from3, $lt: targetStart } }).lean();
  const avgIncome = (incomeRows.reduce((s, r) => s + r.amount, 0) + projectRows.reduce((s, r) => s + r.amount, 0)) / 3;

  const expectedIncome = recurringIncomeTotal + avgIncome;
  const expectedExpenses = recurringExpenseTotal + avgVariableSpend;
  const expectedSavings = expectedIncome - expectedExpenses;

  return {
    year,
    month,
    expectedIncome,
    expectedExpenses,
    expectedSavings,
    breakdown: {
      recurringIncomeTotal,
      avgIncomeLast3Months: avgIncome,
      recurringExpenseTotal,
      avgVariableSpendLast3Months: avgVariableSpend,
    },
  };
}
