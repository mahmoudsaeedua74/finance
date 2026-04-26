import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Budget } from "@/lib/models";

const updateSchema = z.object({
  limit: z.number().min(0),
});

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  await connectDB();
  const doc = await Budget.findOneAndUpdate(
    { _id: params.id, userId: user.id },
    { $set: { limit: parsed.data.limit } },
    { new: true }
  );
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: { ...doc.toObject(), _id: String(doc._id) } });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await connectDB();
  const doc = await Budget.findOneAndDelete({ _id: params.id, userId: user.id });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
