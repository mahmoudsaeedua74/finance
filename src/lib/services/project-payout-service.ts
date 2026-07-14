import mongoose from "mongoose";
import { Project, type IFreelanceProject } from "@/lib/models";
import { syncJobStatus } from "@/lib/services/freelance-project-service";
import type { PaymentMethod } from "@/lib/payment-method";

export type InstallmentInput = {
  amount: number;
  dueDate: Date;
  note?: string;
};

async function sumCollected(userId: string, jobId: mongoose.Types.ObjectId) {
  const rows = await Project.find({
    userId,
    freelanceProjectId: jobId,
    $or: [{ isCollected: true }, { isCollected: { $exists: false } }],
  }).lean();
  return rows.reduce((s, p) => s + p.amount, 0);
}

/** Keep pending installment rows aligned with agreed − collected. */
export async function normalizePendingInstallments(
  userId: string,
  job: Pick<IFreelanceProject, "_id" | "agreedAmount" | "name">
) {
  const jobId =
    typeof job._id === "string" ? new mongoose.Types.ObjectId(job._id) : job._id;
  const uid = new mongoose.Types.ObjectId(userId);
  const collected = await sumCollected(userId, jobId);
  const remaining = Math.max(0, job.agreedAmount - collected);

  const pending = await Project.find({
    userId: uid,
    freelanceProjectId: jobId,
    isCollected: false,
  }).sort({ date: 1 });

  const pendingSum = pending.reduce((s, p) => s + p.amount, 0);

  if (remaining <= 0.005) {
    if (pending.length) {
      await Project.deleteMany({ _id: { $in: pending.map((p) => p._id) } });
    }
    return;
  }

  if (pending.length === 0) {
    await Project.create({
      userId: uid,
      freelanceProjectId: jobId,
      name: job.name,
      amount: remaining,
      date: new Date(),
      isCollected: false,
      collectedAt: null,
      paymentMethod: "unspecified",
      note: "Remaining balance",
    });
    return;
  }

  if (Math.abs(pendingSum - remaining) > 0.01) {
    if (pending.length === 1) {
      pending[0].amount = remaining;
      await pending[0].save();
    } else if (pendingSum > remaining) {
      let excess = pendingSum - remaining;
      for (let i = pending.length - 1; i >= 0 && excess > 0.005; i--) {
        const row = pending[i];
        if (row.amount <= excess + 0.005) {
          excess -= row.amount;
          await Project.deleteOne({ _id: row._id });
        } else {
          row.amount -= excess;
          await row.save();
          excess = 0;
        }
      }
    }
  }
}

export async function addInstallment(
  userId: string,
  job: IFreelanceProject,
  input: InstallmentInput
) {
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid installment amount");
  }
  const collected = await sumCollected(userId, job._id as unknown as mongoose.Types.ObjectId);
  const remaining = job.agreedAmount - collected;
  if (amount > remaining + 0.01) {
    throw new Error("Installment exceeds remaining balance");
  }

  const doc = await Project.create({
    userId,
    freelanceProjectId: job._id,
    name: job.name,
    amount,
    date: input.dueDate,
    isCollected: false,
    collectedAt: null,
    paymentMethod: "unspecified",
    note: input.note?.trim().slice(0, 500) ?? "",
  });

  await normalizePendingInstallments(userId, job);
  await syncJobStatus(String(job._id), userId);
  return doc;
}

export async function remainingBalanceForJob(
  userId: string,
  job: Pick<IFreelanceProject, "_id" | "agreedAmount">
) {
  const jobId =
    typeof job._id === "string" ? new mongoose.Types.ObjectId(job._id) : job._id;
  const collected = await sumCollected(userId, jobId);
  return Math.max(0, job.agreedAmount - collected);
}

export async function collectProjectPayment(
  userId: string,
  job: IFreelanceProject,
  input: {
    amount?: number;
    date: Date;
    paymentMethod: PaymentMethod;
    payoutId?: string;
  }
) {
  const jobId =
    typeof job._id === "string" ? new mongoose.Types.ObjectId(job._id) : job._id;
  const collectedBefore = await sumCollected(userId, jobId);
  const remaining = Math.max(0, job.agreedAmount - collectedBefore);
  if (remaining <= 0.005) {
    throw new Error("Nothing left to collect");
  }

  if (input.payoutId) {
    const row = await Project.findOne({
      _id: input.payoutId,
      userId,
      freelanceProjectId: jobId,
      isCollected: false,
    });
    if (!row) throw new Error("Installment not found");
    row.isCollected = true;
    row.collectedAt = input.date;
    row.date = input.date;
    row.paymentMethod = input.paymentMethod;
    await row.save();
  } else {
    let amount = input.amount != null ? Number(input.amount) : remaining;
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Invalid amount");
    amount = Math.min(amount, remaining);

    const pending = await Project.findOne({
      userId,
      freelanceProjectId: jobId,
      isCollected: false,
    }).sort({ date: 1 });

    if (pending && Math.abs(pending.amount - amount) < 0.01) {
      pending.isCollected = true;
      pending.collectedAt = input.date;
      pending.date = input.date;
      pending.paymentMethod = input.paymentMethod;
      await pending.save();
    } else if (pending && pending.amount > amount + 0.005) {
      pending.amount -= amount;
      await pending.save();
      await Project.create({
        userId,
        freelanceProjectId: jobId,
        name: job.name,
        amount,
        date: input.date,
        isCollected: true,
        collectedAt: input.date,
        paymentMethod: input.paymentMethod,
        note: "Partial collection",
      });
    } else {
      await Project.create({
        userId,
        freelanceProjectId: jobId,
        name: job.name,
        amount,
        date: input.date,
        isCollected: true,
        collectedAt: input.date,
        paymentMethod: input.paymentMethod,
      });
    }
  }

  await normalizePendingInstallments(userId, job);
  await syncJobStatus(String(job._id), userId);
}

export async function createInstallmentSchedule(
  userId: string,
  job: IFreelanceProject,
  installments: InstallmentInput[]
) {
  const uid = new mongoose.Types.ObjectId(userId);
  const total = installments.reduce((s, i) => s + i.amount, 0);
  if (total > job.agreedAmount + 0.01) {
    throw new Error("Installments exceed agreed amount");
  }

  for (const inst of installments) {
    const amt = Number(inst.amount);
    if (!Number.isFinite(amt) || amt <= 0) continue;
    await Project.create({
      userId: uid,
      freelanceProjectId: job._id,
      name: job.name,
      amount: amt,
      date: inst.dueDate,
      isCollected: false,
      collectedAt: null,
      paymentMethod: "unspecified",
      note: inst.note?.trim().slice(0, 500) ?? "",
    });
  }

  await normalizePendingInstallments(userId, job);
}
