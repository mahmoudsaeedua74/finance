import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Income } from "@/lib/models";
import { normalizeIncomeType } from "@/lib/income-types";
import { isDateInMonth } from "@/lib/monthly";
import {
  maybeNotifyLowNetBalance,
  notifyIncomeActivity,
} from "@/lib/services/activity-notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    await connectDB();
    const raw = await Income.find({ userId: user.id }).sort({ date: -1 }).lean();
    const list = raw
      .map((d) => ({
        _id: String(d._id),
        title: d.title,
        amount: d.amount,
        date: d.date,
        incomeType: d.incomeType,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }))
      .filter((d) => {
        if (year == null || month == null) return true;
        const y = Number(year);
        const m = Number(month);
        return isDateInMonth(new Date(d.date), y, m);
      });
    return NextResponse.json({ data: list });
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
    const { title, amount, date, incomeType } = body;
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
    });
    const uid = String(user.id);
    const row = { title: String(title), amount: Number(amount) };
    await notifyIncomeActivity(uid, "created", row);
    await maybeNotifyLowNetBalance(uid);
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
