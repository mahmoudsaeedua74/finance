import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { RecurringIncomeTemplate } from "@/lib/models";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  frequency: z.enum(["monthly", "weekly"]).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional().nullable(),
  active: z.boolean().optional(),
});

type Ctx = { params: { id: string } };

export const dynamic = "force-dynamic";

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
  const update: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startDate) update.startDate = new Date(parsed.data.startDate);
  if (parsed.data.endDate !== undefined) update.endDate = parsed.data.endDate ? new Date(parsed.data.endDate) : null;
  const doc = await RecurringIncomeTemplate.findOneAndUpdate(
    { _id: params.id, userId: user.id },
    update,
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
  const doc = await RecurringIncomeTemplate.findOneAndDelete({ _id: params.id, userId: user.id });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
