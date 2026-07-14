import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Project } from "@/lib/models";
import { queueAfterProject } from "@/lib/services/activity-notifications";
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
    const doc = await Project.findOne({ _id: params.id, userId: user.id }).lean();
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
    const { name, amount, date, note, isCollected, paymentMethod, collectedAt } = body;
    await connectDB();
    const patch: Record<string, unknown> = {};
    if (name != null) patch.name = String(name);
    if (amount != null) patch.amount = Number(amount);
    if (date != null) patch.date = new Date(date);
    if (note !== undefined) {
      patch.note = typeof note === "string" ? note.trim().slice(0, 500) : "";
    }
    if (isCollected !== undefined) {
      patch.isCollected = Boolean(isCollected);
      patch.collectedAt = isCollected
        ? collectedAt
          ? new Date(collectedAt)
          : new Date()
        : null;
    }
    if (paymentMethod !== undefined) {
      patch.paymentMethod =
        paymentMethod === "cash" || paymentMethod === "card" ? paymentMethod : "unspecified";
    }
    const doc = await Project.findOneAndUpdate(
      { _id: params.id, userId: user.id },
      { $set: patch },
      { new: true }
    );
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const uid = String(user.id);
    queueAfterProject(uid, "updated", {
      name: doc.name,
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
    const res = await Project.findOneAndDelete({ _id: params.id, userId: user.id });
    if (!res) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const uid = String(user.id);
    queueAfterProject(uid, "deleted", {
      name: res.name,
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
