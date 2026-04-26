import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { RecurringIncomeTemplate } from "@/lib/models";
import { normalizeIncomeType } from "@/lib/income-types";
import { parseListPagination, toPaginatedBody } from "@/lib/api/list-pagination";

const createSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  frequency: z.enum(["monthly", "weekly"]),
  incomeType: z.enum(["salary", "freelance", "gam3eya", "other"]).optional(),
  payDayOfMonth: z.coerce.number().int().min(1).max(30).optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional().nullable(),
  active: z.boolean().optional(),
});

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  const { searchParams } = new URL(req.url);
  const { limit, offset } = parseListPagination(searchParams);
  await connectDB();
  const take = limit + 1;
  const raw = await RecurringIncomeTemplate.find({ userId: user.id })
    .sort({ createdAt: -1, _id: -1 })
    .skip(offset)
    .limit(take)
    .lean();
  const rows = raw.map((r) => ({ ...r, _id: String(r._id) }));
  return NextResponse.json({ ...toPaginatedBody(rows, offset, limit) });
}

export async function POST(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  await connectDB();
  const it = normalizeIncomeType(parsed.data.incomeType ?? "salary");
  const pay =
    parsed.data.payDayOfMonth != null
      ? parsed.data.payDayOfMonth
      : Math.min(30, Math.max(1, new Date(parsed.data.startDate).getDate()));
  const doc = await RecurringIncomeTemplate.create({
    userId: user.id,
    title: parsed.data.title,
    amount: parsed.data.amount,
    frequency: parsed.data.frequency,
    incomeType: it,
    payDayOfMonth: pay,
    startDate: new Date(parsed.data.startDate),
    endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
    active: parsed.data.active !== false,
  });
  return NextResponse.json({ data: { ...doc.toObject(), _id: String(doc._id) } }, { status: 201 });
}
