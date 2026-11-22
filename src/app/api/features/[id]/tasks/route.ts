import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { createTask, listTasks } from "@/lib/services/feature-service";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Invalid feature id" }, { status: 400 });
  try {
    await connectDB();
    return NextResponse.json({ data: await listTasks(user.id, params.id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Feature not found" }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Invalid feature id" }, { status: 400 });
  try {
    await connectDB();
    return NextResponse.json({ data: await createTask(user.id, params.id, await req.json()) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not create Task" }, { status: 400 });
  }
}
