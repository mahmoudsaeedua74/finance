import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Goal } from "@/lib/models";
import { getGoalProgress } from "@/lib/services/goal-service";

const createGoalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().min(0),
  deadline: z.string().datetime().optional().nullable(),
});

export const dynamic = "force-dynamic";

export async function GET() {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  await connectDB();
  const data = await getGoalProgress(user.id);
  return NextResponse.json({ data });
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
