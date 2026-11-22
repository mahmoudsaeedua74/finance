import mongoose from "mongoose";
import { createHash } from "node:crypto";
import { AuditLog, Feature, FeatureTask, FreelanceProject, Project, TimeSession } from "@/lib/models";
import { roundMoney, toEgpAmount, type ProjectCurrency } from "@/lib/currency";
import { FEATURE_DESCRIPTION_MAX_LENGTH } from "@/lib/feature-description";
import {
  calculateFeatureCostEgp,
  calculateHourlyTaskBalances,
  DEFAULT_FEATURE_HOURLY_RATE_EGP,
  DEFAULT_FEATURE_MINIMUM_PRICE_EGP,
  featurePaymentStatus,
} from "@/lib/feature-pricing";
import type { FeatureDto, FeatureTaskDto, TimeSessionDto } from "@/types/feature";

function oid(value: string) {
  if (!mongoose.isValidObjectId(value)) throw new Error("Invalid id");
  return new mongoose.Types.ObjectId(value);
}

function effectiveSessionSeconds(session: {
  elapsedSeconds: number;
  status: string;
  activeStartedAt?: Date | null;
}) {
  if (session.status !== "running" || !session.activeStartedAt) return Math.max(0, session.elapsedSeconds ?? 0);
  return Math.max(
    0,
    (session.elapsedSeconds ?? 0) + Math.floor((Date.now() - new Date(session.activeStartedAt).getTime()) / 1000)
  );
}

function sessionDto(s: {
  _id: unknown;
  taskId: unknown;
  status: "running" | "paused" | "stopped";
  startedAt: Date;
  activeStartedAt?: Date | null;
  endedAt?: Date | null;
  elapsedSeconds: number;
  billable: boolean;
  source: "timer" | "manual";
}): TimeSessionDto {
  return {
    id: String(s._id),
    taskId: String(s.taskId),
    status: s.status,
    startedAt: new Date(s.startedAt).toISOString(),
    activeStartedAt: s.activeStartedAt ? new Date(s.activeStartedAt).toISOString() : null,
    endedAt: s.endedAt ? new Date(s.endedAt).toISOString() : null,
    elapsedSeconds: effectiveSessionSeconds(s),
    billable: s.billable,
    source: s.source,
  };
}

async function assertProject(userId: string, projectId: string) {
  const project = await FreelanceProject.findOne({ _id: projectId, userId }).lean();
  if (!project) throw new Error("Project not found");
  return project;
}

async function assertFeature(userId: string, featureId: string) {
  const feature = await Feature.findOne({ _id: featureId, userId });
  if (!feature) throw new Error("Feature not found");
  return feature;
}

export async function assertFeatureForRoute(userId: string, featureId: string) {
  return assertFeature(userId, featureId);
}

async function taskDtos(userId: string, featureId: mongoose.Types.ObjectId): Promise<FeatureTaskDto[]> {
  const [tasks, sessions] = await Promise.all([
    FeatureTask.find({ userId, featureId, isArchived: { $ne: true } }).sort({ sortOrder: 1, createdAt: 1 }).lean(),
    TimeSession.find({ userId, featureId }).sort({ createdAt: -1 }).lean(),
  ]);
  return tasks.map((task) => {
    const rows = sessions.filter((s) => String(s.taskId) === String(task._id));
    const trackedSeconds = rows.reduce((sum, s) => sum + effectiveSessionSeconds(s), 0);
    const billableSeconds = rows.reduce(
      (sum, s) => sum + (s.billable ? effectiveSessionSeconds(s) : 0),
      0
    );
    const active = rows.find((s) => s.status === "running");
    return {
      id: String(task._id),
      featureId: String(task.featureId),
      title: task.title,
      description: task.description?.trim() ?? "",
      status: task.status,
      defaultBillable: task.defaultBillable,
      estimatedMinutes: task.estimatedMinutes ?? null,
      sortOrder: task.sortOrder,
      trackedSeconds,
      billableSeconds,
      billableSecondsForPayment: rows.reduce((sum, session) => sum + (session.billable ? session.elapsedSeconds : 0), 0),
      activeSession: active ? sessionDto(active) : null,
      lastSession: rows[0] ? sessionDto(rows[0]) : null,
    };
  });
}

export async function buildFeatureDto(feature: IFeatureLike, userId: string): Promise<FeatureDto> {
  const featureId = oid(String(feature._id));
  const [tasks, payments] = await Promise.all([
    taskDtos(userId, featureId),
    Project.find({ userId, featureId, lineKind: "feature" }).select("amount isCollected taskId").lean(),
  ]);
  const trackedSeconds = tasks.reduce((sum, task) => sum + task.trackedSeconds, 0);
  const billableSeconds = tasks.reduce((sum, task) => sum + task.billableSeconds, 0);
  const calculatedCostEgp = calculateFeatureCostEgp(billableSeconds, feature.hourlyRateEgp);
  const collectedAmountEgp = payments
    .filter((p) => p.isCollected !== false)
    .reduce((sum, p) => sum + p.amount, 0);
  const approvedPriceEgp = feature.approvedPriceEgp ?? null;
  const hourlyBalances = feature.pricingMode === "hourly" && !feature.isArchived && feature.status !== "cancelled"
    ? calculateHourlyTaskBalances(tasks, payments.map((payment) => ({
        amount: payment.amount,
        taskId: payment.taskId ? String(payment.taskId) : null,
        isCollected: payment.isCollected !== false,
      })), feature.hourlyRateEgp, approvedPriceEgp)
    : [];
  hourlyBalances.forEach((balance, index) => {
    tasks[index].billing = {
      amountEgp: balance.amountEgp,
      collectedAmountEgp: balance.collectedAmountEgp,
      collectableAmountEgp: balance.collectableAmountEgp,
      // The same balance across tabs resolves to the same payout ID. Each additional receipt advances it.
      entryId: createHash("sha256")
        .update(`task-payment:${userId}:${featureId}:${balance.taskId}:${balance.paymentCount}`)
        .digest("hex").slice(0, 24),
    };
  });
  const recordedPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const billablePrice = approvedPriceEgp
    ?? (hourlyBalances.length ? roundMoney(recordedPayments + hourlyBalances.reduce((sum, task) => sum + task.collectableAmountEgp, 0)) : null);
  const outstandingAmountEgp = billablePrice == null
    ? 0
    : Math.max(0, roundMoney(billablePrice - collectedAmountEgp));
  return {
    id: String(feature._id),
    projectId: String(feature.freelanceProjectId),
    title: feature.title,
    description: feature.description?.trim() ?? "",
    type: feature.type,
    status: feature.status,
    pricingMode: feature.pricingMode,
    hourlyRateEgp: feature.hourlyRateEgp,
    minimumPriceEgp: feature.minimumPriceEgp ?? null,
    estimatedMinutes: feature.estimatedMinutes ?? null,
    pricingCurrency: feature.pricingCurrency,
    pricingExchangeRateToEgp: feature.pricingExchangeRateToEgp,
    approvedPriceEgp,
    approvedPriceOriginal: feature.approvedPriceOriginal ?? null,
    trackedSeconds,
    billableSeconds,
    calculatedCostEgp,
    collectedAmountEgp,
    outstandingAmountEgp,
    paymentStatus: featurePaymentStatus(feature.pricingMode, billablePrice, collectedAmountEgp),
    isArchived: Boolean(feature.isArchived),
    createdAt: new Date(feature.createdAt).toISOString(),
    updatedAt: new Date(feature.updatedAt).toISOString(),
    tasks,
  };
}

type IFeatureLike = {
  _id: mongoose.Types.ObjectId | string;
  freelanceProjectId: mongoose.Types.ObjectId | string;
  title: string;
  description: string;
  type: "new_feature" | "ui_modification" | "backend_modification" | "business_logic_change" | "technical_support" | "bug_fix";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  pricingMode: "free" | "pricing_pending" | "fixed" | "hourly";
  hourlyRateEgp: number;
  minimumPriceEgp: number | null;
  estimatedMinutes: number | null;
  pricingCurrency: ProjectCurrency;
  pricingExchangeRateToEgp: number;
  approvedPriceEgp: number | null;
  approvedPriceOriginal: number | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type FeatureInput = {
  title?: unknown;
  description?: unknown;
  type?: unknown;
  status?: unknown;
  pricingMode?: unknown;
  hourlyRateEgp?: unknown;
  minimumPriceEgp?: unknown;
  estimatedMinutes?: unknown;
  approvedPriceOriginal?: unknown;
  approvedPriceEgp?: unknown;
  pricingCurrency?: unknown;
};

function normalizedPricingMode(value: unknown): "free" | "pricing_pending" | "fixed" | "hourly" {
  return value === "free" || value === "fixed" || value === "hourly" ? value : "pricing_pending";
}

function normalizedType(value: unknown): IFeatureLike["type"] {
  return value === "ui_modification" || value === "backend_modification" || value === "business_logic_change" || value === "technical_support" || value === "bug_fix"
    ? value
    : "new_feature";
}

function normalizedStatus(value: unknown): IFeatureLike["status"] {
  return value === "in_progress" || value === "completed" || value === "cancelled" ? value : "pending";
}

function finiteOrNull(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function pricingSnapshot(input: FeatureInput, project: { currency?: ProjectCurrency; exchangeRateToEgp?: number }) {
  const pricingCurrency: ProjectCurrency = input.pricingCurrency === "SAR" ? "SAR" : input.pricingCurrency === "EGP" ? "EGP" : project.currency === "SAR" ? "SAR" : "EGP";
  const rate = pricingCurrency === "SAR"
    ? Number(project.exchangeRateToEgp) > 0 ? Number(project.exchangeRateToEgp) : 1
    : 1;
  const original = finiteOrNull(input.approvedPriceOriginal);
  const explicitEgp = finiteOrNull(input.approvedPriceEgp);
  const approvedPriceEgp = explicitEgp ?? (original == null ? null : toEgpAmount(original, pricingCurrency, rate));
  return {
    pricingCurrency,
    pricingExchangeRateToEgp: rate,
    approvedPriceOriginal: original ?? (approvedPriceEgp == null ? null : pricingCurrency === "SAR" ? roundMoney(approvedPriceEgp / rate) : approvedPriceEgp),
    approvedPriceEgp: approvedPriceEgp == null ? null : roundMoney(approvedPriceEgp),
  };
}

export async function listFeatures(userId: string, projectId: string, includeArchived = false) {
  await assertProject(userId, projectId);
  const rows = await Feature.find({
    userId,
    freelanceProjectId: oid(projectId),
    ...(includeArchived ? {} : { isArchived: { $ne: true } }),
  }).sort({ createdAt: -1 }).lean();
  return Promise.all(rows.map((row) => buildFeatureDto(row as never, userId)));
}

export async function createFeature(userId: string, projectId: string, input: FeatureInput) {
  const project = await assertProject(userId, projectId);
  const title = String(input.title ?? "").trim();
  if (!title) throw new Error("Feature title is required");
  const pricingMode = normalizedPricingMode(input.pricingMode);
  const snapshot = pricingSnapshot(input, project);
  const approved = pricingMode === "free" ? { approvedPriceEgp: 0, approvedPriceOriginal: 0 } : snapshot;
  const feature = await Feature.create({
    userId,
    freelanceProjectId: project._id,
    title,
    description: typeof input.description === "string" ? input.description.trim().slice(0, FEATURE_DESCRIPTION_MAX_LENGTH) : "",
    type: normalizedType(input.type),
    status: normalizedStatus(input.status),
    pricingMode,
    hourlyRateEgp: finiteOrNull(input.hourlyRateEgp) ?? DEFAULT_FEATURE_HOURLY_RATE_EGP,
    minimumPriceEgp: finiteOrNull(input.minimumPriceEgp) ?? DEFAULT_FEATURE_MINIMUM_PRICE_EGP,
    estimatedMinutes: finiteOrNull(input.estimatedMinutes),
    ...approved,
    pricingApprovedAt: pricingMode === "free" || approved.approvedPriceEgp != null ? new Date() : null,
  });
  return buildFeatureDto(feature.toObject() as never, userId);
}

export async function updateFeature(userId: string, featureId: string, input: FeatureInput) {
  const feature = await assertFeature(userId, featureId);
  const project = await assertProject(userId, String(feature.freelanceProjectId));
  const before = feature.toObject();
  if (input.title !== undefined) {
    const title = String(input.title).trim();
    if (!title) throw new Error("Feature title is required");
    feature.title = title;
  }
  if (input.description !== undefined) feature.description = String(input.description ?? "").trim().slice(0, FEATURE_DESCRIPTION_MAX_LENGTH);
  if (input.type !== undefined) feature.type = normalizedType(input.type);
  if (input.status !== undefined) {
    feature.status = normalizedStatus(input.status);
    feature.completedAt = feature.status === "completed" ? new Date() : feature.completedAt;
  }
  if (input.pricingMode !== undefined) feature.pricingMode = normalizedPricingMode(input.pricingMode);
  if (input.hourlyRateEgp !== undefined) feature.hourlyRateEgp = finiteOrNull(input.hourlyRateEgp) ?? feature.hourlyRateEgp;
  if (input.minimumPriceEgp !== undefined) feature.minimumPriceEgp = finiteOrNull(input.minimumPriceEgp);
  if (input.estimatedMinutes !== undefined) feature.estimatedMinutes = finiteOrNull(input.estimatedMinutes);
  if (input.approvedPriceEgp !== undefined || input.approvedPriceOriginal !== undefined || input.pricingCurrency !== undefined) {
    const snapshot = pricingSnapshot(input, project);
    feature.pricingCurrency = snapshot.pricingCurrency;
    feature.pricingExchangeRateToEgp = snapshot.pricingExchangeRateToEgp;
    feature.approvedPriceEgp = feature.pricingMode === "free" ? 0 : snapshot.approvedPriceEgp;
    feature.approvedPriceOriginal = feature.pricingMode === "free" ? 0 : snapshot.approvedPriceOriginal;
    feature.pricingApprovedAt = feature.approvedPriceEgp == null ? null : new Date();
  }
  await feature.save();
  await AuditLog.create({
    userId,
    entityType: "feature",
    entityId: feature._id,
    action: "updated",
    before: before as unknown as Record<string, unknown>,
    after: feature.toObject() as unknown as Record<string, unknown>,
  });
  return buildFeatureDto(feature.toObject() as never, userId);
}

export async function archiveFeature(userId: string, featureId: string) {
  const feature = await assertFeature(userId, featureId);
  feature.isArchived = true;
  feature.archivedAt = new Date();
  await feature.save();
  return { ok: true };
}

export async function listTasks(userId: string, featureId: string) {
  const feature = await assertFeature(userId, featureId);
  return taskDtos(userId, oid(String(feature._id)));
}

export async function createTask(userId: string, featureId: string, input: { title?: unknown; description?: unknown; defaultBillable?: unknown; estimatedMinutes?: unknown }) {
  const feature = await assertFeature(userId, featureId);
  const title = String(input.title ?? "").trim();
  if (!title) throw new Error("Task title is required");
  const count = await FeatureTask.countDocuments({ userId, featureId: feature._id, isArchived: { $ne: true } });
  await FeatureTask.create({
    userId,
    featureId: feature._id,
    freelanceProjectId: feature.freelanceProjectId,
    title,
    description: typeof input.description === "string" ? input.description.trim().slice(0, 2000) : "",
    defaultBillable: input.defaultBillable !== false,
    estimatedMinutes: finiteOrNull(input.estimatedMinutes),
    sortOrder: count,
  });
  return listTasks(userId, featureId);
}

export async function updateTask(userId: string, taskId: string, input: { title?: unknown; description?: unknown; status?: unknown; defaultBillable?: unknown; estimatedMinutes?: unknown }) {
  const task = await FeatureTask.findOne({ _id: taskId, userId });
  if (!task) throw new Error("Task not found");
  if (input.title !== undefined) {
    const title = String(input.title).trim();
    if (!title) throw new Error("Task title is required");
    task.title = title;
  }
  if (input.description !== undefined) task.description = String(input.description ?? "").trim().slice(0, 2000);
  if (input.status !== undefined) {
    const status = normalizedStatus(input.status);
    task.status = status;
    task.completedAt = status === "completed" ? new Date() : task.completedAt;
  }
  if (input.defaultBillable !== undefined) task.defaultBillable = Boolean(input.defaultBillable);
  if (input.estimatedMinutes !== undefined) task.estimatedMinutes = finiteOrNull(input.estimatedMinutes);
  await task.save();
  return listTasks(userId, String(task.featureId));
}

export async function archiveTask(userId: string, taskId: string) {
  const task = await FeatureTask.findOne({ _id: taskId, userId });
  if (!task) throw new Error("Task not found");
  task.isArchived = true;
  task.status = "cancelled";
  await task.save();
  return { ok: true };
}

export async function getFeatureForTimer(userId: string, featureId: string, taskId: string) {
  const feature = await assertFeature(userId, featureId);
  const task = await FeatureTask.findOne({ _id: taskId, userId, featureId: feature._id, isArchived: { $ne: true } });
  if (!task) throw new Error("Task not found");
  return { feature, task };
}
