import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Income } from "@/lib/models";
import { normalizeIncomeType } from "@/lib/income-types";
import { monthDateBoundsUTC, incomeInMonth } from "@/lib/db-month-filters";
import { parseListPagination, toPaginatedBody } from "@/lib/api/list-pagination";
import { queueAfterIncome } from "@/lib/services/activity-notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const { limit, offset } = parseListPagination(searchParams);
    const yearQ = searchParams.get("year");
    const monthQ = searchParams.get("month");
    await connectDB();
    const take = limit + 1;
    if (yearQ != null && monthQ != null) {
      const y = Number(yearQ);
      const m = Number(monthQ);
      if (!y || m < 1 || m > 12) {
        return NextResponse.json(
          { error: "Query params year and month (1-12) are required" },
          { status: 400 }
        );
      }
      const { mStart, mEnd } = monthDateBoundsUTC(y, m);
      const q = incomeInMonth(user.id, mStart, mEnd);
      const raw = await Income.find(q)
        .sort({ date: -1, _id: -1 })
        .skip(offset)
        .limit(take)
        .lean();
      const list = raw.map((d) => ({
        _id: String(d._id),
        title: d.title,
        amount: d.amount,
        date: d.date,
        incomeType: d.incomeType,
        category: d.category || d.incomeType,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }));
      return NextResponse.json({ ...toPaginatedBody(list, offset, limit) });
    }
    const raw = await Income.find({ userId: user.id })
      .sort({ date: -1, _id: -1 })
      .skip(offset)
      .limit(take)
      .lean();
    const list = raw.map((d) => ({
      _id: String(d._id),
      title: d.title,
      amount: d.amount,
      date: d.date,
      incomeType: d.incomeType,
      category: d.category || d.incomeType,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
    return NextResponse.json({ ...toPaginatedBody(list, offset, limit) });
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
    const { title, amount, date, incomeType, category } = body;
    if (!title || amount == null || !date) {
      return NextResponse.json(
        { error: "title, amount, and date are required" },
        { status: 400 }
      );
    }
    await connectDB();
    const doc = await Income.create({
      userId: user.id,
      title: String(title),
      amount: Number(amount),
      date: new Date(date),
      incomeType: normalizeIncomeType(incomeType),
      category: String(category ?? incomeType ?? "other").trim(),
    });
    const uid = String(user.id);
    const row = { title: String(title), amount: Number(amount) };
    queueAfterIncome(uid, "created", row);
    return NextResponse.json(
      { data: { ...doc.toObject(), _id: String(doc._id) } },
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
