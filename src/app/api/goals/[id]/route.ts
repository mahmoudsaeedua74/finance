import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Goal } from "@/lib/models";

const updateGoalSchema = z.object({
  name: z.string().min(1).optional(),
  targetAmount: z.number().min(0).optional(),
  deadline: z.string().datetime().optional().nullable(),
  status: z.enum(["active", "completed", "paused"]).optional(),
});

type Ctx = { params: { id: string } };

export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const parsed = updateGoalSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  await connectDB();
  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.deadline !== undefined) {
    update.deadline = parsed.data.deadline ? new Date(parsed.data.deadline) : null;
  }
  const doc = await Goal.findOneAndUpdate({ _id: params.id, userId: user.id }, update, { new: true });
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
  const doc = await Goal.findOneAndDelete({ _id: params.id, userId: user.id });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
