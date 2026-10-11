import mongoose from "mongoose";
import { endOfMonth, startOfMonth, subMonths } from "date-fns";
import { Expense, Income, Project, RecurringIncomeTemplate } from "@/lib/models";

function asOid(userId: string) {
  return new mongoose.Types.ObjectId(userId);
}

export async function forecastNextMonth(userId: string, year: number, month: number) {
  const uid = asOid(userId);
  const targetStart = startOfMonth(new Date(year, month - 1, 1));
  const targetEnd = endOfMonth(targetStart);
  const from3 = startOfMonth(subMonths(targetStart, 3));

  const [
    recurringExpenseAgg,
    recurringIncomeAgg,
    variableAgg,
    incomeAgg,
    projectAgg,
  ] = await Promise.all([
    Expense.aggregate<{ total: number }>([
      {
        $match: {
          userId: uid,
          isTemplate: true,
          recurring: true,
          validFrom: { $lte: targetEnd },
          $or: [{ validTo: null }, { validTo: { $gte: targetStart } }],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    RecurringIncomeTemplate.aggregate<{ total: number }>([
      {
        $match: {
          userId: uid,
          active: true,
          startDate: { $lte: targetEnd },
          $or: [{ endDate: null }, { endDate: { $gte: targetStart } }],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate<{ total: number }>([
      {
        $match: {
          userId: uid,
          isTemplate: false,
          kind: "variable",
          date: { $gte: from3, $lt: targetStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Income.aggregate<{ total: number }>([
      {
        $match: {
          userId: uid,
          date: { $gte: from3, $lt: targetStart },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Project.aggregate<{ total: number }>([
      {
        $match: {
          userId: uid,
          date: { $gte: from3, $lt: targetStart },
          $or: [{ isCollected: true }, { isCollected: { $exists: false } }],
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const recurringExpenseTotal = recurringExpenseAgg[0]?.total ?? 0;
  const recurringIncomeTotal = recurringIncomeAgg[0]?.total ?? 0;
  const avgVariableSpend = (variableAgg[0]?.total ?? 0) / 3;
  const avgIncome = ((incomeAgg[0]?.total ?? 0) + (projectAgg[0]?.total ?? 0)) / 3;

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
