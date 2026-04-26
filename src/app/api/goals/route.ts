import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Goal } from "@/lib/models";
import { getGoalProgressPage } from "@/lib/services/goal-service";
import { parseListPagination, toPaginatedBody } from "@/lib/api/list-pagination";

const createGoalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().min(0),
  deadline: z.string().datetime().optional().nullable(),
});

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  const { searchParams } = new URL(req.url);
  const { limit, offset } = parseListPagination(searchParams);
  await connectDB();
  const take = limit + 1;
  const rows = await getGoalProgressPage(user.id, offset, take);
  return NextResponse.json({ ...toPaginatedBody(rows, offset, limit) });
}

export async function POST(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  const parsed = createGoalSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }
  await connectDB();
  const doc = await Goal.create({
    userId: user.id,
    name: parsed.data.name,
    targetAmount: parsed.data.targetAmount,
    deadline: parsed.data.deadline ? new Date(parsed.data.deadline) : null,
    status: "active",
    manualContributionTotal: 0,
  });
  return NextResponse.json({ data: { ...doc.toObject(), _id: String(doc._id) } }, { status: 201 });
}
