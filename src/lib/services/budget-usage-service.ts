import { endOfMonth, startOfMonth } from "date-fns";
import { Budget, Expense } from "@/lib/models";
import { budgetStatus, monthKeyOf } from "@/lib/services/budget-service";

export type BudgetUsageRow = {
  category: string;
  limit: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: "safe" | "warning" | "over";
};

export async function getBudgetUsage(userId: string, year: number, month: number) {
  const monthKey = monthKeyOf(year, month);
  const budgets = await Budget.find({ userId, monthKey }).lean();
  const start = startOfMonth(new Date(year, month - 1, 1));
  const end = endOfMonth(start);

  const expenses = await Expense.find({
    userId,
    isTemplate: false,
    date: { $gte: start, $lte: end },
  })
    .select({ category: 1, amount: 1 })
    .lean();

  const categorySpent = new Map<string, number>();
  for (const e of expenses) {
    categorySpent.set(e.category, (categorySpent.get(e.category) || 0) + e.amount);
  }

  const rows: BudgetUsageRow[] = budgets.map((b) => {
    const spent = categorySpent.get(b.category) || 0;
    const percentage = b.limit > 0 ? (spent / b.limit) * 100 : 0;
    return {
      category: b.category,
      limit: b.limit,
      spent,
      remaining: b.limit - spent,
      percentage,
      status: budgetStatus(percentage),
    };
  });

  rows.sort((a, b) => b.percentage - a.percentage);
  return { monthKey, rows };
}

export async function upsertBudget(input: {
  userId: string;
  category: string;
  year: number;
  month: number;
  limit: number;
}) {
  const monthKey = monthKeyOf(input.year, input.month);
  const doc = await Budget.findOneAndUpdate(
    { userId: input.userId, category: input.category, monthKey },
    {
      userId: input.userId,
      category: input.category,
      monthKey,
      limit: input.limit,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  return doc!;
}
