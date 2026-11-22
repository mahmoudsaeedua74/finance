import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { archiveTask, updateTask } from "@/lib/services/feature-service";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  try {
    await connectDB();
    return NextResponse.json({ data: await updateTask(user.id, params.id, await req.json()) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not update Task" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  try {
    await connectDB();
    return NextResponse.json(await archiveTask(user.id, params.id));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not archive Task" }, { status: 400 });
  }
}
