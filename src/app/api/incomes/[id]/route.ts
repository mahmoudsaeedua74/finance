import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Income } from "@/lib/models";
import { normalizeIncomeType } from "@/lib/income-types";
import { queueAfterIncome } from "@/lib/services/activity-notifications";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const doc = await Income.findOne({ _id: params.id, userId: user.id }).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { ...doc, _id: String(doc._id) } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await req.json();
    const { title, amount, date, incomeType } = body;
    await connectDB();
    const doc = await Income.findOneAndUpdate(
      { _id: params.id, userId: user.id },
      {
        ...(title != null && { title: String(title) }),
        ...(amount != null && { amount: Number(amount) }),
        ...(date != null && { date: new Date(date) }),
        ...(incomeType != null && { incomeType: normalizeIncomeType(incomeType) }),
      },
      { new: true }
    );
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const uid = String(user.id);
    queueAfterIncome(uid, "updated", {
      title: doc.title,
      amount: doc.amount,
    });
    return NextResponse.json({ data: { ...doc.toObject(), _id: String(doc._id) } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const res = await Income.findOneAndDelete({ _id: params.id, userId: user.id });
    if (!res) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const uid = String(user.id);
    queueAfterIncome(uid, "deleted", {
      title: res.title,
      amount: res.amount,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
