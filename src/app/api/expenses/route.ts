import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Expense } from "@/lib/models";
import { expenseNonTemplateInMonth, expenseTemplatesApplyingInMonth, monthDateBoundsUTC } from "@/lib/db-month-filters";
import { parseExpensePostBody } from "@/lib/api/expense-post-body";
import {
  buildMonthViewExpenseRows,
  buildNonTemplateEntryRows,
  buildTemplatesListRows,
  expenseCreatedJson,
  EXPENSE_API_LIST_PROJECTION,
} from "@/lib/api/expense-list-response";
import { queueAfterExpense } from "@/lib/services/activity-notifications";
import { parseListPagination, toPaginatedBody } from "@/lib/api/list-pagination";
import { defaultDueDayFromValidFrom } from "@/lib/due-day-of-month";

export const dynamic = "force-dynamic";

export type { ExpenseListRow as ExpenseRow } from "@/lib/api/expense-list-response";

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const { limit, offset } = parseListPagination(searchParams);
    const yearQ = searchParams.get("year");
    const monthQ = searchParams.get("month");
    const entriesQ = searchParams.get("entries");
    await connectDB();
    const listSel = String(EXPENSE_API_LIST_PROJECTION);
    const take = limit + 1;
    if (entriesQ === "1" && (yearQ == null || monthQ == null)) {
      const lines = await Expense.find({ userId: user.id, isTemplate: false })
        .select(listSel)
        .sort({ date: -1, _id: -1 })
        .skip(offset)
        .limit(take)
        .lean();
      const rows = buildNonTemplateEntryRows(lines as never[]);
      return NextResponse.json({ ...toPaginatedBody(rows, offset, limit) });
    }
    if (yearQ == null || monthQ == null) {
      const templates = await Expense.find({ userId: user.id, isTemplate: true })
        .select(listSel)
        .sort({ date: -1 })
        .skip(offset)
        .limit(take)
        .lean();
      const rows = buildTemplatesListRows(templates as never[]);
      return NextResponse.json({ ...toPaginatedBody(rows, offset, limit) });
    }
    const year = Number(yearQ);
    const month = Number(monthQ);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Query params year and month (1-12) are required" },
        { status: 400 }
      );
    }
    const { mStart, mEnd } = monthDateBoundsUTC(year, month);
    const [nonT, templateDocs] = await Promise.all([
      Expense.find(expenseNonTemplateInMonth(user.id, mStart, mEnd))
        .select(listSel)
        .sort({ date: -1 })
        .lean(),
      Expense.find(expenseTemplatesApplyingInMonth(user.id, mStart, mEnd))
        .select(listSel)
        .lean(),
    ]);
    const allRows = buildMonthViewExpenseRows(
      nonT as never[],
      templateDocs as never[],
      year,
      month
    );
    return NextResponse.json({ ...toPaginatedBody(allRows, offset, limit) });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    const body = await req.json();
    const parsed = parseExpensePostBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    await connectDB();
    if (parsed.data.variant === "recurring") {
      const p = parsed.data;
      const due =
        p.dueDayOfMonth > 0 ? p.dueDayOfMonth : defaultDueDayFromValidFrom(p.validFrom);
      const doc = await Expense.create({
        userId: user.id,
        title: p.title,
        amount: p.amount,
        date: p.validFrom,
        category: p.category,
        kind: "fixed",
        recurring: true,
        isTemplate: true,
        validFrom: p.validFrom,
        validTo: p.validTo,
        dueDayOfMonth: due,
        projectName: p.projectName,
      });
      const uid = String(user.id);
      queueAfterExpense(uid, "created", { title: p.title, amount: p.amount });
      return NextResponse.json(
        { data: expenseCreatedJson(doc.toObject()) },
        { status: 201 }
      );
    }
    const p = parsed.data;
    const doc = await Expense.create({
      userId: user.id,
      title: p.title,
      amount: p.amount,
      date: p.date,
      category: p.category,
      kind: p.kind,
      recurring: false,
      isTemplate: false,
      validFrom: p.date,
      validTo: null,
      projectName: p.projectName,
    });
    const uid = String(user.id);
    queueAfterExpense(uid, "created", { title: p.title, amount: p.amount });
    return NextResponse.json(
      { data: expenseCreatedJson(doc.toObject()) },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
