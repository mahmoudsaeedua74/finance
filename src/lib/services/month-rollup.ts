import { Expense, Income, type IExpense } from "@/lib/models";
import {
  expenseNonTemplateInMonth,
  expenseTemplatesApplyingInMonth,
  monthDateBoundsUTC,
} from "@/lib/db-month-filters";

export async function getMonthSalaryTotal(userId: string, year: number, month: number) {
  const { mStart, mEnd } = monthDateBoundsUTC(year, month);
  const rows = await Income.find({
    userId,
    incomeType: "salary",
    date: { $gte: mStart, $lte: mEnd },
  }).lean();
  return rows.reduce((s, r) => s + r.amount, 0);
}

export async function getMonthExpenseTotal(userId: string, year: number, month: number) {
  const { mStart, mEnd } = monthDateBoundsUTC(year, month);
  const nq = expenseNonTemplateInMonth(userId, mStart, mEnd);
  const tq = expenseTemplatesApplyingInMonth(userId, mStart, mEnd);
  const [expNon, expTpl] = await Promise.all([Expense.find(nq).lean(), Expense.find(tq).lean()]);
  const expenses = [...(expNon as IExpense[]), ...(expTpl as IExpense[])];
  let t = 0;
  for (const e of expenses) {
    if (e.isTemplate && e.recurring) t += e.amount;
    else if (!e.isTemplate) t += e.amount;
  }
  return t;
}
