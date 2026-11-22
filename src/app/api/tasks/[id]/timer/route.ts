import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { FeatureTask } from "@/lib/models";
import { editTimeSession, listTaskSessions, logManualTime, pauseTimer, resumeTimer, startTimer, stopTimer, switchTimer } from "@/lib/services/time-tracking-service";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

function statusOf(error: unknown) {
  return error && typeof error === "object" && "status" in error && typeof error.status === "number" ? error.status : 400;
}

export async function GET(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  try {
    await connectDB();
    return NextResponse.json({ data: await listTaskSessions(user.id, params.id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load sessions" }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Invalid task id" }, { status: 400 });
  try {
    const body = await req.json();
    await connectDB();
    const task = await FeatureTask.findOne({ _id: params.id, userId: user.id, isArchived: { $ne: true } }).lean();
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const action = String(body?.action ?? "");
    if (action === "manual") {
      const data = body.sessionId
        ? await editTimeSession(user.id, params.id, String(body.sessionId), body)
        : await logManualTime(user.id, String(task.featureId), params.id, body);
      return NextResponse.json({ data });
    }
    const data = action === "start"
      ? await startTimer(user.id, String(task.featureId), params.id)
      : action === "switch"
        ? await switchTimer(user.id, String(task.featureId), params.id)
        : action === "pause"
          ? await pauseTimer(user.id, String(body?.sessionId ?? ""))
          : action === "resume"
            ? await resumeTimer(user.id, String(body?.sessionId ?? ""))
            : action === "stop"
              ? await stopTimer(user.id, String(body?.sessionId ?? ""))
              : null;
    if (!data && action !== "pause") return NextResponse.json({ error: "Unknown timer action" }, { status: 400 });
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Timer action failed" }, { status: statusOf(e) });
  }
}
