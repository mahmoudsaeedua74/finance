import mongoose from "mongoose";
import { Expense, Income } from "@/lib/models";
import {
  expenseNonTemplateInMonth,
  expenseTemplatesApplyingInMonth,
  monthDateBoundsUTC,
} from "@/lib/db-month-filters";

function asOid(userId: string) {
  return new mongoose.Types.ObjectId(userId);
}

export async function getMonthSalaryTotal(userId: string, year: number, month: number) {
  const { mStart, mEnd } = monthDateBoundsUTC(year, month);
  const [row] = await Income.aggregate<{ total: number }>([
    {
      $match: {
        userId: asOid(userId),
        incomeType: "salary",
        date: { $gte: mStart, $lte: mEnd },
      },
    },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  return row?.total ?? 0;
}

export async function getMonthExpenseTotal(userId: string, year: number, month: number) {
  const { mStart, mEnd } = monthDateBoundsUTC(year, month);
  const uid = asOid(userId);
  const nq = { ...expenseNonTemplateInMonth(userId, mStart, mEnd), userId: uid };
  const tq = { ...expenseTemplatesApplyingInMonth(userId, mStart, mEnd), userId: uid };
  const [nonAgg, tplAgg] = await Promise.all([
    Expense.aggregate<{ total: number }>([
      { $match: nq },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Expense.aggregate<{ total: number }>([
      { $match: tq },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);
  return (nonAgg[0]?.total ?? 0) + (tplAgg[0]?.total ?? 0);
}
