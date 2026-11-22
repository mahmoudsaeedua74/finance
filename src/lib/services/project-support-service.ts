import mongoose from "mongoose";
import { roundMoney } from "@/lib/currency";
import { Project } from "@/lib/models";
import { isWalletPaymentMethod, parsePaymentMethodBody, type PaymentMethod } from "@/lib/payment-method";
import { PAYMENT_METHOD_REQUIRED_MSG } from "@/lib/project-job-lifecycle";

type SupportProject = { _id: string; name: string; expectedPaymentMethod: PaymentMethod };
type SupportInput = { amount?: unknown; date?: unknown; note?: unknown; paymentMethod?: unknown };
type SupportAction = "add_support" | "update_support" | "delete_support" | "collect_support";

export class SupportPayoutError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}

function supportDate(value: unknown) {
  const date = value == null ? new Date() : new Date(String(value));
  if (Number.isNaN(date.getTime())) throw new SupportPayoutError("Invalid date");
  return date;
}

function supportMethod(input: unknown, fallback: PaymentMethod) {
  const method = parsePaymentMethodBody(input);
  if (isWalletPaymentMethod(method)) return method;
  if (isWalletPaymentMethod(fallback)) return fallback;
  throw new SupportPayoutError(PAYMENT_METHOD_REQUIRED_MSG);
}

function supportDetails(input: SupportInput, isCollected: boolean, fallback: PaymentMethod) {
  const amount = roundMoney(Number(input.amount));
  if (!Number.isFinite(amount) || amount <= 0) throw new SupportPayoutError("Invalid amount");
  const date = supportDate(input.date);
  const note = typeof input.note === "string" ? input.note.trim().slice(0, 500) : "";
  return {
    amount,
    date,
    note,
    collectedAt: isCollected ? date : null,
    paymentMethod: isCollected ? supportMethod(input.paymentMethod, fallback) : "unspecified" as const,
    ...(isCollected ? {} : { dueDate: date }),
  };
}

export async function mutateProjectSupport(
  userId: string,
  project: SupportProject,
  action: SupportAction,
  input: SupportInput & { supportId?: unknown; entryId?: unknown; isCollected?: unknown },
) {
  const scope = { userId, freelanceProjectId: project._id, lineKind: "support" as const };
  if (action === "add_support") {
    const isCollected = input.isCollected === true;
    const data = { ...supportDetails(input, isCollected, project.expectedPaymentMethod), name: project.name, isCollected };
    if (input.entryId === undefined) {
      await Project.create({ ...scope, ...data });
      return;
    }
    if (typeof input.entryId !== "string" || !mongoose.isObjectIdOrHexString(input.entryId)) {
      throw new SupportPayoutError("Invalid support entry id");
    }
    await Project.updateOne(
      { ...scope, _id: input.entryId },
      { $setOnInsert: data },
      { upsert: true, runValidators: true },
    );
    return;
  }

  if (typeof input.supportId !== "string" || !mongoose.isObjectIdOrHexString(input.supportId)) {
    throw new SupportPayoutError("Invalid support id");
  }
  const filter = { ...scope, _id: input.supportId };
  const row = await Project.findOne(filter).lean();
  if (!row) throw new SupportPayoutError("Support record not found", 404);
  if (action === "delete_support") {
    await Project.deleteOne(filter);
    return;
  }

  const isCollected = row.isCollected !== false;
  if (action === "update_support") {
    const fields = supportDetails(input, isCollected, project.expectedPaymentMethod);
    const updated = await Project.updateOne(
      { ...filter, isCollected: isCollected ? { $ne: false } : false },
      { $set: fields },
      { runValidators: true },
    );
    if (!updated.matchedCount) throw new SupportPayoutError("Support payment changed. Refresh and try again.", 409);
    return;
  }

  if (isCollected) return;
  if (input.amount !== undefined && Number(input.amount) !== row.amount) {
    throw new SupportPayoutError("Support amount changed. Refresh and try again.", 409);
  }
  const date = supportDate(input.date);
  const paymentMethod = supportMethod(input.paymentMethod, project.expectedPaymentMethod);
  const result = await Project.updateOne(
    { ...filter, isCollected: false, amount: row.amount, date: row.date },
    { $set: { isCollected: true, collectedAt: date, date, dueDate: row.dueDate ?? row.date, paymentMethod } },
  );
  if (!result.matchedCount && !(await Project.exists({ ...filter, isCollected: true }))) {
    throw new SupportPayoutError("Support payment changed. Refresh and try again.", 409);
  }
}
