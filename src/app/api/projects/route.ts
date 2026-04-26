import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Project } from "@/lib/models";
import { isDateInMonth } from "@/lib/monthly";
import {
  maybeNotifyLowNetBalance,
  notifyProjectActivity,
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
    const raw = await Project.find({ userId: user.id }).sort({ date: -1 }).lean();
    const list = raw
      .map((d) => ({
        _id: String(d._id),
        name: d.name,
        amount: d.amount,
        date: d.date,
        note: d.note?.trim() || "",
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }))
      .filter((d) => {
        if (year == null || month == null) return true;
        return isDateInMonth(new Date(d.date), Number(year), Number(month));
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
    const { name, amount, date, note } = body;
    if (!name || amount == null || !date) {
      return NextResponse.json(
        { error: "name, amount, and date are required" },
        { status: 400 }
      );
    }
    await connectDB();
    const doc = await Project.create({
      userId: user.id,
      name: String(name),
      amount: Number(amount),
      date: new Date(date),
      note: typeof note === "string" ? note.trim().slice(0, 500) : "",
    });
    const uid = String(user.id);
    await notifyProjectActivity(uid, "created", {
      name: String(name),
      amount: Number(amount),
    });
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
