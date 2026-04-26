import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { RecurringIncomeTemplate } from "@/lib/models";

const createSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  frequency: z.enum(["monthly", "weekly"]),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
});

export const dynamic = "force-dynamic";

export async function GET() {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  await connectDB();
  const rows = await RecurringIncomeTemplate.find({ userId: user.id }).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ data: rows.map((r) => ({ ...r, _id: String(r._id) })) });
}

export async function POST(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  await connectDB();
  const doc = await RecurringIncomeTemplate.create({
    userId: user.id,
    title: parsed.data.title,
    amount: parsed.data.amount,
    frequency: parsed.data.frequency,
    startDate: new Date(parsed.data.startDate),
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    active: true,
  });
  return NextResponse.json({ data: { ...doc.toObject(), _id: String(doc._id) } }, { status: 201 });
}
