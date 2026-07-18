import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Expense, FreelanceProject, Project } from "@/lib/models";
import {
  buildProjectJobDto,
  syncJobStatus,
} from "@/lib/services/freelance-project-service";
import { isWalletPaymentMethod, normalizePaymentMethod, parsePaymentMethodBody, type PaymentMethod } from "@/lib/payment-method";
import { parseProjectTypeBody } from "@/lib/project-type";
import { parseClientName, parseScopeItems } from "@/lib/project-scope";
import { parseWorkPhaseBody } from "@/lib/project-work-phase";
import { ensureClientPhone } from "@/lib/services/client-profile-service";
import {
  assertJobNotCancelled,
  autoCollectRemainingOnDelivered,
  parseCancellationReason,
  PAYMENT_METHOD_REQUIRED_MSG,
  JOB_CANCELLED_MSG,
  resolveCollectPaymentMethod,
} from "@/lib/project-job-lifecycle";
import { queueAfterExpense, queueAfterProject } from "@/lib/services/activity-notifications";
import {
  addInstallment,
  collectProjectPayment,
  remainingBalanceForJob,
} from "@/lib/services/project-payout-service";
import {
  cloneFreelanceProject,
  setProjectArchived,
} from "@/lib/services/project-template-service";
import { DELETE_HAS_COLLECTION_MSG, canDeleteProjectJob } from "@/lib/project-job-rules";
import mongoose from "mongoose";
import { resolveProjectMoney } from "@/lib/project-money";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    await connectDB();
    const job = await FreelanceProject.findOne({ _id: params.id, userId: user.id }).lean();
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const dto = await buildProjectJobDto(job as never, user.id);
    return NextResponse.json({ data: dto });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const body = await req.json();
    await connectDB();

    const existing = await FreelanceProject.findOne({ _id: params.id, userId: user.id });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (existing.status === "cancelled") {
      return NextResponse.json({ error: JOB_CANCELLED_MSG }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (body?.name != null) update.name = String(body.name).trim();

    const amountTouched = body?.agreedAmount != null || body?.currency != null;
    if (amountTouched) {
      const amountInCurrency =
        body?.agreedAmount != null
          ? Number(body.agreedAmount)
          : Number(
              existing.originalAmount != null && Number.isFinite(existing.originalAmount)
                ? existing.originalAmount
                : existing.agreedAmount
            );
      if (!Number.isFinite(amountInCurrency) || amountInCurrency < 0) {
        return NextResponse.json({ error: "Invalid agreedAmount" }, { status: 400 });
      }
      try {
        const money = await resolveProjectMoney(
          amountInCurrency,
          body?.currency ?? existing.currency ?? "EGP"
        );
        update.agreedAmount = money.agreedAmount;
        update.currency = money.currency;
        update.originalAmount = money.originalAmount;
        update.exchangeRateToEgp = money.exchangeRateToEgp;
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Could not resolve exchange rate" },
          { status: 502 }
        );
      }
    }

    if (body?.notes !== undefined) {
      update.notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : "";
    }
    if (body?.startDate != null) update.startDate = new Date(String(body.startDate));
    if (body?.expectedPaymentDate !== undefined) {
      update.expectedPaymentDate = body.expectedPaymentDate
        ? new Date(String(body.expectedPaymentDate))
        : null;
    }
    if (body?.paymentMethod !== undefined || body?.expectedPaymentMethod !== undefined) {
      update.expectedPaymentMethod =
        parsePaymentMethodBody(body.paymentMethod ?? body.expectedPaymentMethod) ?? "unspecified";
    }
    if (body?.projectType !== undefined) {
      update.projectType = parseProjectTypeBody(body.projectType) ?? "normal";
    }
    if (body?.clientName !== undefined) {
      update.clientName = parseClientName(body.clientName);
    }
    if (body?.scopeItems !== undefined) {
      update.scopeItems = parseScopeItems(body.scopeItems);
    }

    const nextWorkPhase =
      body?.workPhase !== undefined ? parseWorkPhaseBody(body.workPhase) : undefined;
    if (nextWorkPhase) update.workPhase = nextWorkPhase;

    if (body?.status === "cancelled") {
      try {
        update.cancellationReason = parseCancellationReason(body.cancellationReason);
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Cancellation reason required" },
          { status: 400 }
        );
      }
      update.status = "cancelled";
    } else if (
      body?.status != null &&
      ["pending", "partial", "collected"].includes(body.status)
    ) {
      update.status = body.status;
      if (body.status !== "cancelled") {
        update.cancellationReason = "";
      }
    }

    const effectivePaymentMethod = normalizePaymentMethod(
      (update.expectedPaymentMethod as PaymentMethod | undefined) ?? existing.expectedPaymentMethod
    );

    const markingDelivered =
      nextWorkPhase === "delivered" && existing.workPhase !== "delivered";

    if (markingDelivered) {
      const remaining = await remainingBalanceForJob(user.id, existing.toObject() as never);
      if (remaining > 0.005) {
        let paymentMethod;
        try {
          paymentMethod = resolveCollectPaymentMethod(undefined, effectivePaymentMethod);
        } catch (e) {
          return NextResponse.json(
            { error: e instanceof Error ? e.message : PAYMENT_METHOD_REQUIRED_MSG },
            { status: 400 }
          );
        }
        const jobSnap = existing.toObject() as never;
        if (update.expectedPaymentMethod) {
          existing.expectedPaymentMethod = effectivePaymentMethod as never;
        }
        try {
          await autoCollectRemainingOnDelivered(user.id, jobSnap, paymentMethod);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Collection failed";
          if (msg !== "Nothing left to collect") {
            return NextResponse.json({ error: msg }, { status: 400 });
          }
        }
      }
    }

    const job = await FreelanceProject.findOneAndUpdate(
      { _id: params.id, userId: user.id },
      { $set: update },
      { new: true }
    );
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (body?.name != null || body?.agreedAmount != null || body?.currency != null || body?.paymentMethod != null) {
      const pendingPayout = await Project.findOne({
        userId: user.id,
        freelanceProjectId: job._id,
        isCollected: false,
      }).sort({ date: -1 });
      if (pendingPayout) {
        if (body?.name != null) pendingPayout.name = job.name;
        if (body?.agreedAmount != null || body?.currency != null) pendingPayout.amount = job.agreedAmount;
        if (body?.paymentMethod != null || body?.expectedPaymentMethod != null) {
          pendingPayout.paymentMethod = job.expectedPaymentMethod;
        }
        await pendingPayout.save();
      }
      if (body?.name != null) {
        await Project.updateMany(
          { userId: user.id, freelanceProjectId: job._id },
          { $set: { name: job.name } }
        );
        await Expense.updateMany(
          { userId: user.id, freelanceProjectId: job._id },
          { $set: { projectName: job.name } }
        );
      }
    }

    await syncJobStatus(String(job._id), user.id);
    const clientPhone =
      typeof body?.clientPhone === "string" ? body.clientPhone.trim().slice(0, 50) : "";
    const effectiveClientName =
      typeof update.clientName === "string" ? update.clientName : job.clientName?.trim() ?? "";
    if (effectiveClientName && clientPhone) {
      await ensureClientPhone(user.id, effectiveClientName, clientPhone);
    }
    const refreshed = await FreelanceProject.findById(job._id);
    const dto = await buildProjectJobDto((refreshed ?? job).toObject() as never, user.id);
    return NextResponse.json({ data: dto });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    await connectDB();
    const job = await FreelanceProject.findOne({ _id: params.id, userId: user.id });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const dto = await buildProjectJobDto(job.toObject() as never, user.id);
    if (!canDeleteProjectJob(dto)) {
      return NextResponse.json({ error: DELETE_HAS_COLLECTION_MSG }, { status: 400 });
    }
    await FreelanceProject.deleteOne({ _id: params.id, userId: user.id });
    await Project.deleteMany({ freelanceProjectId: job._id, userId: user.id });
    await Expense.updateMany(
      { freelanceProjectId: job._id, userId: user.id },
      { $set: { freelanceProjectId: null } }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

/** POST body: { action: "collect" | "cancel" | "add_payout" | "add_cost", ... } */
export async function POST(req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  try {
    const body = await req.json();
    const action = String(body?.action ?? "");
    await connectDB();
    const job = await FreelanceProject.findOne({ _id: params.id, userId: user.id });
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

    if (action === "cancel") {
      if (job.status === "cancelled") {
        return NextResponse.json({ error: "Already cancelled" }, { status: 400 });
      }
      let reason: string;
      try {
        reason = parseCancellationReason(body.cancellationReason);
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Cancellation reason required" },
          { status: 400 }
        );
      }
      job.status = "cancelled";
      job.cancellationReason = reason;
      await job.save();
      const dto = await buildProjectJobDto(job.toObject() as never, user.id);
      return NextResponse.json({ data: dto });
    }

    if (action === "clone") {
      const name = typeof body?.name === "string" ? body.name.trim() : undefined;
      const agreedAmount = body?.agreedAmount != null ? Number(body.agreedAmount) : undefined;
      const clientName = typeof body?.clientName === "string" ? body.clientName : undefined;
      const dto = await cloneFreelanceProject(user.id, params.id, {
        name,
        agreedAmount,
        clientName,
      });
      return NextResponse.json({ data: dto }, { status: 201 });
    }

    if (action === "archive" || action === "unarchive") {
      const dto = await setProjectArchived(user.id, params.id, action === "archive");
      return NextResponse.json({ data: dto });
    }

    assertJobNotCancelled(job.status);

    if (action === "collect") {
      let paymentMethod;
      try {
        paymentMethod = resolveCollectPaymentMethod(
          parsePaymentMethodBody(body?.paymentMethod),
          job.expectedPaymentMethod
        );
      } catch (e) {
        return NextResponse.json(
          { error: e instanceof Error ? e.message : PAYMENT_METHOD_REQUIRED_MSG },
          { status: 400 }
        );
      }
      const date = body?.date ? new Date(String(body.date)) : new Date();
      if (Number.isNaN(date.getTime())) {
        return NextResponse.json({ error: "Invalid date" }, { status: 400 });
      }
      const payoutId = typeof body?.payoutId === "string" ? body.payoutId : undefined;
      const amountRaw = body?.amount;
      if (amountRaw != null && (!Number.isFinite(Number(amountRaw)) || Number(amountRaw) <= 0)) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
      await collectProjectPayment(user.id, job.toObject() as never, {
        amount: amountRaw != null ? Number(amountRaw) : undefined,
        date,
        paymentMethod,
        payoutId,
      });
      queueAfterProject(user.id, "updated", { name: job.name, amount: Number(body?.amount) || 0 });
      await syncJobStatus(String(job._id), user.id);
      const refreshed = await FreelanceProject.findById(job._id);
      const dto = await buildProjectJobDto((refreshed ?? job).toObject() as never, user.id);
      return NextResponse.json({ data: dto });
    }

    if (action === "add_installment") {
      const amount = Number(body?.amount);
      const dueDate = body?.dueDate ? new Date(String(body.dueDate)) : new Date();
      const note = typeof body?.note === "string" ? body.note : "";
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
      if (Number.isNaN(dueDate.getTime())) {
        return NextResponse.json({ error: "Invalid dueDate" }, { status: 400 });
      }
      await addInstallment(user.id, job.toObject() as never, { amount, dueDate, note });
      const dto = await buildProjectJobDto(job.toObject() as never, user.id);
      return NextResponse.json({ data: dto }, { status: 201 });
    }

    if (action === "add_payout") {
      const amount = Number(body?.amount);
      const isCollected = Boolean(body?.isCollected);
      const paymentMethod = parsePaymentMethodBody(body?.paymentMethod) ?? "unspecified";
      const date = body?.date ? new Date(String(body.date)) : new Date();
      const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) : "";
      if (!Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
      }
      if (isCollected && !isWalletPaymentMethod(paymentMethod)) {
        return NextResponse.json({ error: PAYMENT_METHOD_REQUIRED_MSG }, { status: 400 });
      }
      await Project.create({
        userId: user.id,
        freelanceProjectId: job._id,
        name: job.name,
        amount,
        date,
        isCollected,
        collectedAt: isCollected ? date : null,
        paymentMethod: isCollected ? paymentMethod : "unspecified",
        note,
      });
      await syncJobStatus(String(job._id), user.id);
      const refreshed = await FreelanceProject.findById(job._id);
      const dto = await buildProjectJobDto((refreshed ?? job).toObject() as never, user.id);
      return NextResponse.json({ data: dto }, { status: 201 });
    }

    if (action === "add_cost") {
      const title = String(body?.title ?? "").trim();
      const amount = Number(body?.amount);
      const category = String(body?.category ?? "general").trim() || "general";
      const paymentMethod = parsePaymentMethodBody(body?.paymentMethod) ?? "unspecified";
      const date = body?.date ? new Date(String(body.date)) : new Date();
      if (!title || !Number.isFinite(amount) || amount <= 0) {
        return NextResponse.json({ error: "title and amount are required" }, { status: 400 });
      }
      const doc = await Expense.create({
        userId: user.id,
        title,
        amount,
        date,
        category,
        kind: "variable",
        recurring: false,
        isTemplate: false,
        validFrom: date,
        validTo: null,
        projectName: job.name,
        freelanceProjectId: job._id,
        paymentMethod,
      });
      queueAfterExpense(user.id, "created", { title, amount });
      const dto = await buildProjectJobDto(job.toObject() as never, user.id);
      return NextResponse.json({ data: { job: dto, expenseId: String(doc._id) } }, { status: 201 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
