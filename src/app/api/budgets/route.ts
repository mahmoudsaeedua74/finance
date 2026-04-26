import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Budget } from "@/lib/models";
import { upsertBudget } from "@/lib/services/budget-usage-service";

const createSchema = z.object({
  category: z.string().min(1),
  year: z.number().int().min(2000).max(3000),
  month: z.number().int().min(1).max(12),
  limit: z.number().min(0),
});

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  await connectDB();
  const monthKey = year && month ? `${year}-${String(month).padStart(2, "0")}` : undefined;
  const query = monthKey ? { userId: user.id, monthKey } : { userId: user.id };
  const rows = await Budget.find(query).sort({ category: 1 }).lean();
  return NextResponse.json({
    data: rows.map((r) => ({ ...r, _id: String(r._id) })),
  });
}

export async function POST(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  await connectDB();
  const doc = await upsertBudget({ ...parsed.data, userId: user.id });
  return NextResponse.json({ data: { ...doc.toObject(), _id: String(doc._id) } }, { status: 201 });
}
