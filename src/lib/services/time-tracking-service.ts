import mongoose from "mongoose";
import { AuditLog, FeatureTask, TimeSession } from "@/lib/models";
import { getFeatureForTimer } from "@/lib/services/feature-service";

function oid(value: string) {
  if (!mongoose.isValidObjectId(value)) throw new Error("Invalid id");
  return new mongoose.Types.ObjectId(value);
}

function secondsBetween(start: Date | null | undefined, end: Date) {
  if (!start) return 0;
  return Math.max(0, Math.floor((end.getTime() - new Date(start).getTime()) / 1000));
}

function effectiveSeconds(session: { elapsedSeconds: number; status: string; activeStartedAt?: Date | null }, now = new Date()) {
  return Math.max(
    0,
    (session.elapsedSeconds ?? 0) + (session.status === "running" ? secondsBetween(session.activeStartedAt, now) : 0)
  );
}

async function activeSession(userId: string) {
  return TimeSession.findOne({ userId, status: "running" }).sort({ startedAt: -1 });
}

async function ensureTask(userId: string, taskId: string) {
  const task = await FeatureTask.findOne({ _id: taskId, userId, isArchived: { $ne: true } });
  if (!task) throw new Error("Task not found");
  return task;
}

async function pauseDoc(session: { elapsedSeconds: number; activeStartedAt: Date | null; status: "running" | "paused" | "stopped"; save: () => Promise<unknown> }, now: Date) {
  session.elapsedSeconds = effectiveSeconds(session, now);
  session.activeStartedAt = null;
  session.status = "paused";
  await session.save();
}

export async function getActiveTimer(userId: string) {
  const session = await activeSession(userId);
  if (!session) return null;
  return {
    id: String(session._id),
    taskId: String(session.taskId),
    featureId: String(session.featureId),
    status: session.status,
    startedAt: session.startedAt.toISOString(),
    activeStartedAt: session.activeStartedAt?.toISOString() ?? null,
    elapsedSeconds: effectiveSeconds(session),
    billable: session.billable,
  };
}

export async function startTimer(userId: string, featureId: string, taskId: string) {
  const { task } = await getFeatureForTimer(userId, featureId, taskId);
  const current = await activeSession(userId);
  if (current) {
    if (String(current.taskId) === String(task._id)) return getActiveTimer(userId);
    const error = new Error("Another timer is already running");
    (error as Error & { status?: number }).status = 409;
    throw error;
  }
  const now = new Date();
  try {
    await TimeSession.create({
      userId,
      featureId: oid(featureId),
      taskId: task._id,
      status: "running",
      startedAt: now,
      activeStartedAt: now,
      elapsedSeconds: 0,
      billable: task.defaultBillable,
      source: "timer",
    });
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      const conflict = new Error("Another timer is already running");
      (conflict as Error & { status?: number }).status = 409;
      throw conflict;
    }
    throw error;
  }
  return getActiveTimer(userId);
}

export async function pauseTimer(userId: string, sessionId: string) {
  const session = await TimeSession.findOne({ _id: sessionId, userId });
  if (!session) throw new Error("Running timer not found");
  if (session.status === "paused") return getActiveTimer(userId);
  if (session.status !== "running") throw new Error("Running timer not found");
  await pauseDoc(session, new Date());
  return getActiveTimer(userId);
}

export async function resumeTimer(userId: string, sessionId: string) {
  const session = await TimeSession.findOne({ _id: sessionId, userId });
  if (!session) throw new Error("Paused timer not found");
  if (session.status === "running") return getActiveTimer(userId);
  if (session.status !== "paused") throw new Error("Paused timer not found");
  const current = await activeSession(userId);
  if (current && String(current._id) !== String(session._id)) {
    const error = new Error("Another timer is already running");
    (error as Error & { status?: number }).status = 409;
    throw error;
  }
  session.status = "running";
  session.activeStartedAt = new Date();
  await session.save();
  return getActiveTimer(userId);
}

export async function stopTimer(userId: string, sessionId: string) {
  const session = await TimeSession.findOne({ _id: sessionId, userId });
  if (!session) throw new Error("Active timer not found");
  if (session.status === "stopped") {
    return { id: String(session._id), elapsedSeconds: session.elapsedSeconds, status: session.status };
  }
  const now = new Date();
  session.elapsedSeconds = effectiveSeconds(session, now);
  session.activeStartedAt = null;
  session.endedAt = now;
  session.status = "stopped";
  await session.save();
  return { id: String(session._id), elapsedSeconds: session.elapsedSeconds, status: session.status };
}

export async function switchTimer(userId: string, featureId: string, taskId: string) {
  await ensureTask(userId, taskId);
  const current = await activeSession(userId);
  if (current && String(current.taskId) !== taskId) await pauseDoc(current, new Date());
  const existing = await TimeSession.findOne({ userId, featureId: oid(featureId), taskId: oid(taskId), status: "paused" }).sort({ startedAt: -1 });
  if (existing) return resumeTimer(userId, String(existing._id));
  return startTimer(userId, featureId, taskId);
}

export async function editTimeSession(userId: string, sessionId: string, input: { elapsedSeconds?: unknown; startedAt?: unknown; endedAt?: unknown; reason?: unknown }) {
  const session = await TimeSession.findOne({ _id: sessionId, userId, status: { $ne: "running" } });
  if (!session) throw new Error("Only paused or stopped sessions can be edited");
  const before = session.toObject();
  const nextStart = input.startedAt ? new Date(String(input.startedAt)) : session.startedAt;
  const nextEnd = input.endedAt ? new Date(String(input.endedAt)) : session.endedAt;
  let seconds = input.elapsedSeconds !== undefined ? Number(input.elapsedSeconds) : session.elapsedSeconds;
  if (input.startedAt !== undefined || input.endedAt !== undefined) {
    if (!nextEnd || Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime()) || nextEnd < nextStart) {
      throw new Error("Invalid session timestamps");
    }
    seconds = secondsBetween(nextStart, nextEnd);
  }
  if (!Number.isFinite(seconds) || seconds < 0) throw new Error("Invalid duration");
  session.startedAt = nextStart;
  session.endedAt = nextEnd;
  session.elapsedSeconds = Math.floor(seconds);
  session.source = "manual";
  session.manualEditReason = String(input.reason ?? "").trim().slice(0, 500);
  await session.save();
  await AuditLog.create({
    userId,
    entityType: "time_session",
    entityId: session._id,
    action: "manual_time_edit",
    before: before as unknown as Record<string, unknown>,
    after: session.toObject() as unknown as Record<string, unknown>,
    reason: session.manualEditReason,
  });
  return session.toObject();
}

export async function listTaskSessions(userId: string, taskId: string) {
  await ensureTask(userId, taskId);
  const rows = await TimeSession.find({ userId, taskId: oid(taskId) }).sort({ startedAt: -1 }).lean();
  return rows.map((row) => ({
    id: String(row._id),
    taskId: String(row.taskId),
    featureId: String(row.featureId),
    status: row.status,
    startedAt: row.startedAt.toISOString(),
    activeStartedAt: row.activeStartedAt?.toISOString() ?? null,
    endedAt: row.endedAt?.toISOString() ?? null,
    elapsedSeconds: effectiveSeconds(row),
    billable: row.billable,
    source: row.source,
  }));
}
