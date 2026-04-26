import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Expense } from "@/lib/models";
import { defaultDueDayFromValidFrom, parseDueDayOfMonth } from "@/lib/due-day-of-month";
import { queueAfterExpense } from "@/lib/services/activity-notifications";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const doc = await Expense.findOne({ _id: params.id, userId: user.id }).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: { ...doc, _id: String(doc._id) } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = await req.json();
    const {
      title,
      amount,
      category,
      kind,
      date,
      recurring,
      isTemplate,
      validFrom,
      validTo,
      projectName: projectNameRaw,
      dueDayOfMonth: dueDayRaw,
    } = body;
    await connectDB();
    const existing = await Expense.findOne({ _id: params.id, userId: user.id }).lean();
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const willBeTemplate =
      isTemplate != null ? Boolean(isTemplate) : existing.isTemplate;

    const update: Record<string, unknown> = {};
    if (title != null) update.title = String(title);
    if (amount != null) update.amount = Number(amount);
    if (category != null) update.category = String(category);
    if (kind != null) update.kind = kind;
    if (date != null) update.date = new Date(date);
    if (recurring != null) update.recurring = Boolean(recurring);
    if (isTemplate != null) update.isTemplate = Boolean(isTemplate);
    if (validFrom != null) {
      const vf = new Date(String(validFrom));
      update.validFrom = vf;
      // Templates: `date` is the list/sort field and must follow the rule start (see Expense model).
      if (willBeTemplate) {
        update.date = vf;
      }
    }
    if (validTo !== undefined) update.validTo = validTo ? new Date(validTo) : null;
    if (dueDayRaw !== undefined && (existing.isTemplate || willBeTemplate)) {
      const parsed = parseDueDayOfMonth(dueDayRaw);
      if (!parsed.ok) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      if (parsed.value > 0) {
        update.dueDayOfMonth = parsed.value;
      } else if (willBeTemplate) {
        const vf = (update.validFrom as Date | undefined) ?? existing.validFrom;
        update.dueDayOfMonth = defaultDueDayFromValidFrom(
          vf instanceof Date ? vf : new Date(String(vf))
        );
      }
    }
    if (projectNameRaw !== undefined) {
      update.projectName =
        typeof projectNameRaw === "string" ? projectNameRaw.trim().slice(0, 200) : "";
    }

    const doc = await Expense.findOneAndUpdate(
      { _id: params.id, userId: user.id },
      update,
      { new: true }
    );
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const uid = String(user.id);
    queueAfterExpense(uid, "updated", {
      title: doc.title,
      amount: doc.amount,
    });
    return NextResponse.json({ data: { ...doc.toObject(), _id: String(doc._id) } });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const res = await Expense.findOneAndDelete({ _id: params.id, userId: user.id });
    if (!res) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const uid = String(user.id);
    queueAfterExpense(uid, "deleted", {
      title: res.title,
      amount: res.amount,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
