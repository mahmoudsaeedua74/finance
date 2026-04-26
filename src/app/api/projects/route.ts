import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Project } from "@/lib/models";
import { isDateInMonth } from "@/lib/monthly";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    await connectDB();
    const raw = await Project.find().sort({ date: -1 }).lean();
    const list = raw
      .map((d) => ({
        _id: String(d._id),
        name: d.name,
        amount: d.amount,
        date: d.date,
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
  try {
    const body = await req.json();
    const { name, amount, date } = body;
    if (!name || amount == null || !date) {
      return NextResponse.json(
        { error: "name, amount, and date are required" },
        { status: 400 }
      );
    }
    await connectDB();
    const doc = await Project.create({
      name: String(name),
      amount: Number(amount),
      date: new Date(date),
    });
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
