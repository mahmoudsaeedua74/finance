import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Goal, GoalContribution } from "@/lib/models";

const contributionSchema = z.object({
  amount: z.number().positive(),
  date: z.string().datetime().optional(),
  source: z.enum(["manual", "auto"]).optional(),
});

type Ctx = { params: { id: string } };

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  const parsed = contributionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload", details: parsed.error.flatten() }, { status: 400 });
  }

  await connectDB();
  const goal = await Goal.findOne({ _id: params.id, userId: user.id });
  if (!goal) return NextResponse.json({ error: "Goal not found" }, { status: 404 });

  const contribution = await GoalContribution.create({
    userId: user.id,
    goalId: goal._id,
    amount: parsed.data.amount,
    date: parsed.data.date ? new Date(parsed.data.date) : new Date(),
    source: parsed.data.source || "manual",
  });
  goal.manualContributionTotal += parsed.data.amount;
  await goal.save();

  return NextResponse.json(
    { data: { ...contribution.toObject(), _id: String(contribution._id) } },
    { status: 201 }
  );
}
