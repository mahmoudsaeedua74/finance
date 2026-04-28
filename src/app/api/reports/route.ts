import { endOfMonth, endOfYear, startOfMonth, startOfYear } from "date-fns";
import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Expense, Income, Project } from "@/lib/models";

export const dynamic = "force-dynamic";

type FilterType = "monthly" | "yearly" | "all";

function parseFilter(v: string | null): FilterType {
  if (v === "yearly") return "yearly";
  if (v === "all") return "all";
  return "monthly";
}

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const filter = parseFilter(searchParams.get("filter"));
    const now = new Date();
    const range =
      filter === "monthly"
        ? { start: startOfMonth(now), end: endOfMonth(now) }
        : filter === "yearly"
          ? { start: startOfYear(now), end: endOfYear(now) }
          : null;
    await connectDB();

    const incomeQuery = range
      ? { userId: user.id, date: { $gte: range.start, $lte: range.end } }
      : { userId: user.id };
    const expenseNonTemplateQuery = range
      ? { userId: user.id, isTemplate: false, date: { $gte: range.start, $lte: range.end } }
      : { userId: user.id, isTemplate: false };
    const recurringTemplateQuery = range
      ? {
          userId: user.id,
          isTemplate: true,
          recurring: true,
          validFrom: { $lte: range.end },
          $or: [{ validTo: null }, { validTo: { $gte: range.start } }],
        }
      : { userId: user.id, isTemplate: true, recurring: true };
    const projectQuery = range
      ? { userId: user.id, date: { $gte: range.start, $lte: range.end } }
      : { userId: user.id };

    const [incomeRows, expenseRows, recurringRows, projectRows] = await Promise.all([
      Income.find(incomeQuery).lean(),
      Expense.find(expenseNonTemplateQuery).lean(),
      Expense.find(recurringTemplateQuery).lean(),
      Project.find(projectQuery).lean(),
    ]);

    const totalIncome =
      incomeRows.reduce((s, r) => s + r.amount, 0) +
      projectRows.reduce((s, r) => s + r.amount, 0);
    const totalExpense =
      expenseRows.reduce((s, r) => s + r.amount, 0) +
      recurringRows.reduce((s, r) => s + r.amount, 0);
    const netBalance = totalIncome - totalExpense;

    return NextResponse.json({
      data: {
        filter,
        period: range
          ? { start: range.start.toISOString(), end: range.end.toISOString() }
          : null,
        summary: { totalIncome, totalExpense, netBalance },
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
