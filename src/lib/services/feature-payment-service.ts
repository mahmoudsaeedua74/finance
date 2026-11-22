import mongoose from "mongoose";
import { AuditLog, Feature, Project } from "@/lib/models";
import { roundMoney, toEgpAmount, type ProjectCurrency } from "@/lib/currency";

function oid(value: string) {
  if (!mongoose.isValidObjectId(value)) throw new Error("Invalid id");
  return new mongoose.Types.ObjectId(value);
}

async function assertFeature(userId: string, featureId: string) {
  const feature = await Feature.findOne({ _id: featureId, userId });
  if (!feature) throw new Error("Feature not found");
  return feature;
}

async function featurePaymentTotals(userId: string, featureId: mongoose.Types.ObjectId) {
  const rows = await Project.find({ userId, featureId, lineKind: "feature" }).lean();
  return {
    rows,
    collected: rows.filter((p) => p.isCollected !== false).reduce((s, p) => s + p.amount, 0),
    scheduled: rows.reduce((s, p) => s + p.amount, 0),
  };
}

function paymentAmount(input: { amount?: unknown; originalAmount?: unknown; currency?: unknown; exchangeRateToEgp?: unknown }) {
  const currency: ProjectCurrency = input.currency === "SAR" ? "SAR" : "EGP";
  const original = Number(input.originalAmount ?? input.amount);
  if (!Number.isFinite(original) || original <= 0) throw new Error("Invalid payment amount");
  const rate = currency === "SAR" ? Number(input.exchangeRateToEgp) : 1;
  if (currency === "SAR" && (!Number.isFinite(rate) || rate <= 0)) throw new Error("A valid SAR exchange rate is required");
  return {
    currency,
    originalAmount: roundMoney(original),
    exchangeRateToEgp: rate,
    amountEgp: toEgpAmount(original, currency, rate),
  };
}

export async function listFeaturePayments(userId: string, featureId: string) {
  await assertFeature(userId, featureId);
  const rows = await Project.find({ userId, featureId: oid(featureId), lineKind: "feature" }).sort({ date: -1 }).lean();
  return rows.map((row) => ({
    id: String(row._id),
    featureId: String(row.featureId),
    amountEgp: row.amount,
    originalAmount: row.originalAmount ?? row.amount,
    currency: row.currency ?? "EGP",
    exchangeRateToEgp: row.exchangeRateToEgp ?? 1,
    date: row.date.toISOString(),
    collectedAt: row.collectedAt?.toISOString() ?? null,
    isCollected: row.isCollected !== false,
    paymentMethod: row.paymentMethod,
    note: row.note?.trim() ?? "",
  }));
}

export async function createFeaturePayment(
  userId: string,
  featureId: string,
  input: { amount?: unknown; originalAmount?: unknown; currency?: unknown; exchangeRateToEgp?: unknown; date?: unknown; isCollected?: unknown; paymentMethod?: unknown; note?: unknown }
) {
  const feature = await assertFeature(userId, featureId);
  if (feature.approvedPriceEgp == null && feature.pricingMode !== "free") {
    throw new Error("Approve the Feature price before creating a payment");
  }
  const money = paymentAmount(input);
  const isCollected = input.isCollected === true;
  const totals = await featurePaymentTotals(userId, oid(String(feature._id)));
  if (feature.approvedPriceEgp != null && totals.scheduled + money.amountEgp > feature.approvedPriceEgp + 0.01) {
    throw new Error("Feature payment exceeds the approved price");
  }
  const date = input.date ? new Date(String(input.date)) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error("Invalid payment date");
  const paymentMethod = input.paymentMethod === "cash" || input.paymentMethod === "card" ? input.paymentMethod : "unspecified";
  if (isCollected && paymentMethod === "unspecified") throw new Error("Payment method is required for collected payments");
  const row = await Project.create({
    userId,
    freelanceProjectId: feature.freelanceProjectId,
    featureId: feature._id,
    name: feature.title,
    amount: money.amountEgp,
    originalAmount: money.originalAmount,
    currency: money.currency,
    exchangeRateToEgp: money.exchangeRateToEgp,
    date,
    dueDate: isCollected ? null : date,
    isCollected,
    collectedAt: isCollected ? date : null,
    paymentMethod: isCollected ? paymentMethod : "unspecified",
    note: typeof input.note === "string" ? input.note.trim().slice(0, 500) : "",
    lineKind: "feature",
  });
  return { id: String(row._id), amountEgp: row.amount, isCollected: row.isCollected !== false };
}

export async function collectFeaturePayment(userId: string, paymentId: string, input: { date?: unknown; paymentMethod?: unknown }) {
  const row = await Project.findOne({ _id: paymentId, userId, lineKind: "feature", isCollected: false });
  if (!row) throw new Error("Pending Feature payment not found");
  const paymentMethod = input.paymentMethod === "cash" || input.paymentMethod === "card" ? input.paymentMethod : "unspecified";
  if (paymentMethod === "unspecified") throw new Error("Payment method is required");
  const date = input.date ? new Date(String(input.date)) : new Date();
  if (Number.isNaN(date.getTime())) throw new Error("Invalid payment date");
  row.isCollected = true;
  row.dueDate ??= row.date;
  row.collectedAt = date;
  row.date = date;
  row.paymentMethod = paymentMethod;
  await row.save();
  return { id: String(row._id), amountEgp: row.amount, isCollected: true };
}

export async function updateFeaturePayment(userId: string, paymentId: string, input: { note?: unknown; date?: unknown; amount?: unknown }) {
  const row = await Project.findOne({ _id: paymentId, userId, lineKind: "feature" });
  if (!row) throw new Error("Feature payment not found");
  const before = row.toObject();
  if (input.note !== undefined) row.note = String(input.note ?? "").trim().slice(0, 500);
  if (input.date !== undefined) {
    const date = new Date(String(input.date));
    if (Number.isNaN(date.getTime())) throw new Error("Invalid payment date");
    row.date = date;
    if (row.isCollected !== false) row.collectedAt = date;
    else row.dueDate = date;
  }
  if (input.amount !== undefined) {
    const next = Number(input.amount);
    if (!Number.isFinite(next) || next <= 0) throw new Error("Invalid payment amount");
    const totals = await featurePaymentTotals(userId, row.featureId!);
    const scheduledWithout = totals.scheduled - row.amount;
    const feature = await assertFeature(userId, String(row.featureId));
    if (feature.approvedPriceEgp != null && scheduledWithout + next > feature.approvedPriceEgp + 0.01) {
      throw new Error("Feature payment exceeds the approved price");
    }
    row.amount = roundMoney(next);
    row.originalAmount = row.currency === "EGP" ? row.amount : row.originalAmount;
  }
  await row.save();
  await AuditLog.create({ userId, entityType: "payment", entityId: row._id, action: "updated", before: before as unknown as Record<string, unknown>, after: row.toObject() as unknown as Record<string, unknown> });
  return { id: String(row._id), amountEgp: row.amount, isCollected: row.isCollected !== false };
}

export async function deleteFeaturePayment(userId: string, paymentId: string) {
  const row = await Project.findOne({ _id: paymentId, userId, lineKind: "feature" });
  if (!row) throw new Error("Feature payment not found");
  if (row.isCollected !== false) {
    throw new Error("Collected Feature payments cannot be deleted; edit them with an audit trail");
  }
  await Project.deleteOne({ _id: String(row._id), userId });
  await AuditLog.create({ userId, entityType: "payment", entityId: row._id, action: "deleted", before: row.toObject() as unknown as Record<string, unknown>, after: null });
  return { ok: true };
}
