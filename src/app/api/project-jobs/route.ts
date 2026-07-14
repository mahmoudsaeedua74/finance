import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Expense, FreelanceProject, Project } from "@/lib/models";
import {
  buildProjectJobDto,
  listProjectJobs,
  syncJobStatus,
} from "@/lib/services/freelance-project-service";
import { isWalletPaymentMethod, parsePaymentMethodBody } from "@/lib/payment-method";
import { PAYMENT_METHOD_REQUIRED_MSG } from "@/lib/project-job-lifecycle";
import { parseProjectTypeBody } from "@/lib/project-type";
import { parseClientName, parseScopeItems } from "@/lib/project-scope";
import { defaultWorkPhaseForCreate, parseWorkPhaseBody } from "@/lib/project-work-phase";
import { ensureClientPhone } from "@/lib/services/client-profile-service";
import { parseProjectJobListFilters, parseProjectJobPagination } from "@/lib/project-job-filters";
import { createInstallmentSchedule } from "@/lib/services/project-payout-service";
import { queueAfterProject } from "@/lib/services/activity-notifications";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const filters = parseProjectJobListFilters(searchParams);
    const { offset, limit } = parseProjectJobPagination(searchParams);
    const { rows, meta, hasMore, nextOffset } = await listProjectJobs(user.id, filters, {
      offset,
      limit,
    });
    return NextResponse.json({
      data: rows,
      hasMore,
      nextOffset,
      meta,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

type CostInput = { title: string; amount: number; category?: string; paymentMethod?: string };
type InstallmentInputBody = { amount: number; dueDate?: string; note?: string };

export async function POST(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    const body = await req.json();
    const name = String(body?.name ?? "").trim();
    const agreedAmount = Number(body?.agreedAmount);
    const notes = typeof body?.notes === "string" ? body.notes.trim().slice(0, 500) : "";
    const startDateRaw = body?.startDate;
    const expectedPaymentDateRaw = body?.expectedPaymentDate;
    const isCollected = Boolean(body?.isCollected);
    const paymentMethod = parsePaymentMethodBody(body?.paymentMethod) ?? "unspecified";
    const projectType = parseProjectTypeBody(body?.projectType) ?? "normal";
    const clientName = parseClientName(body?.clientName);
    const clientPhone = typeof body?.clientPhone === "string" ? body.clientPhone.trim().slice(0, 50) : "";
    const scopeItems = parseScopeItems(body?.scopeItems);
    const workPhase = parseWorkPhaseBody(body?.workPhase) ?? defaultWorkPhaseForCreate(isCollected);
    const costs = Array.isArray(body?.costs) ? (body.costs as CostInput[]) : [];
    const installments = Array.isArray(body?.installments)
      ? (body.installments as InstallmentInputBody[])
      : [];

    if (!name || !Number.isFinite(agreedAmount) || agreedAmount < 0) {
      return NextResponse.json(
        { error: "name and agreedAmount are required" },
        { status: 400 }
      );
    }
    const startDate = startDateRaw ? new Date(String(startDateRaw)) : new Date();
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
    }
    const expectedPaymentDate = expectedPaymentDateRaw
      ? new Date(String(expectedPaymentDateRaw))
      : null;
    if (expectedPaymentDate && Number.isNaN(expectedPaymentDate.getTime())) {
      return NextResponse.json({ error: "Invalid expectedPaymentDate" }, { status: 400 });
    }
    if (isCollected && !isWalletPaymentMethod(paymentMethod)) {
      return NextResponse.json({ error: PAYMENT_METHOD_REQUIRED_MSG }, { status: 400 });
    }

    await connectDB();
    const job = await FreelanceProject.create({
      userId: user.id,
      name,
      agreedAmount,
      notes,
      startDate,
      expectedPaymentDate,
      expectedPaymentMethod: paymentMethod,
      projectType,
      clientName,
      scopeItems,
      workPhase,
      status: isCollected ? "collected" : "pending",
    });

    if (isCollected && agreedAmount > 0) {
      await Project.create({
        userId: user.id,
        freelanceProjectId: job._id,
        name,
        amount: agreedAmount,
        date: startDate,
        isCollected: true,
        collectedAt: new Date(),
        paymentMethod,
        note: "Initial collection",
      });
    } else if (!isCollected && agreedAmount > 0) {
      const parsedInstallments = installments
        .map((i) => ({
          amount: Number(i?.amount),
          dueDate: i?.dueDate ? new Date(String(i.dueDate)) : startDate,
          note: typeof i?.note === "string" ? i.note.trim() : "",
        }))
        .filter((i) => Number.isFinite(i.amount) && i.amount > 0);

      if (parsedInstallments.length > 0) {
        await createInstallmentSchedule(user.id, job.toObject() as never, parsedInstallments);
      } else {
        await Project.create({
          userId: user.id,
          freelanceProjectId: job._id,
          name,
          amount: agreedAmount,
          date: startDate,
          isCollected: false,
          collectedAt: null,
          paymentMethod,
          note: "Pending collection",
        });
      }
    }

    for (const c of costs) {
      const title = String(c?.title ?? "").trim();
      const amt = Number(c?.amount);
      if (!title || !Number.isFinite(amt) || amt <= 0) continue;
      await Expense.create({
        userId: user.id,
        title,
        amount: amt,
        date: startDate,
        category: String(c?.category ?? "general").trim() || "general",
        kind: "variable",
        recurring: false,
        isTemplate: false,
        validFrom: startDate,
        validTo: null,
        projectName: name,
        freelanceProjectId: job._id,
        paymentMethod: parsePaymentMethodBody(c?.paymentMethod) ?? "unspecified",
      });
    }

    await syncJobStatus(String(job._id), user.id);
    if (clientName && clientPhone) {
      await ensureClientPhone(user.id, clientName, clientPhone);
    }
    const refreshed = await FreelanceProject.findById(job._id);
    const dto = await buildProjectJobDto((refreshed ?? job).toObject() as never, user.id);
    queueAfterProject(user.id, "created", { name, amount: agreedAmount });
    return NextResponse.json({ data: dto }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
