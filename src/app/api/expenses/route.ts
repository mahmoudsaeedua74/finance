import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Expense } from "@/lib/models";
import {
  expenseNonTemplateInMonth,
  expenseTemplatesApplyingInMonth,
  monthDateBoundsUTC,
} from "@/lib/db-month-filters";
import { queueAfterExpense } from "@/lib/services/activity-notifications";
import { startOfMonth } from "date-fns";

export const dynamic = "force-dynamic";

function serialize(d: {
  _id: unknown;
  title: string;
  amount: number;
  date: Date;
  category: string;
  kind: string;
  recurring: boolean;
  isTemplate: boolean;
  validFrom: Date;
  validTo: Date | null;
  projectName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}) {
  return {
    _id: String(d._id),
    title: d.title,
    amount: d.amount,
    date: d.date,
    category: d.category,
    kind: d.kind,
    recurring: d.recurring,
    isTemplate: d.isTemplate,
    validFrom: d.validFrom,
    validTo: d.validTo,
    projectName: d.projectName?.trim() || "",
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

export type ExpenseRow = ReturnType<typeof serialize> & {
  rowKind: "variable" | "fixed_once" | "recurring";
  /** for recurring, virtual date in the viewed month (first of month) */
  displayDate?: string;
};

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const yearQ = searchParams.get("year");
    const monthQ = searchParams.get("month");
    await connectDB();
    if (yearQ == null || monthQ == null) {
      /** Unscoped: only recurring templates (UI filters to this; avoids full-table scans). */
      const templates = await Expense.find({ userId: user.id, isTemplate: true })
        .sort({ date: -1 })
        .lean();
      return NextResponse.json({
        data: templates.map((d) => ({
          ...serialize(d as never),
          rowKind: d.isTemplate
            ? "recurring"
            : d.kind === "fixed"
              ? "fixed_once"
              : "variable",
        })),
      });
    }
    const year = Number(yearQ);
    const month = Number(monthQ);
    const { mStart, mEnd } = monthDateBoundsUTC(year, month);
    const [nonT, templateDocs] = await Promise.all([
      Expense.find(
        expenseNonTemplateInMonth(user.id, mStart, mEnd)
      )
        .sort({ date: -1 })
        .lean(),
      Expense.find(
        expenseTemplatesApplyingInMonth(user.id, mStart, mEnd)
      ).lean(),
    ]);

    type ERow = {
      _id: unknown;
      title: string;
      amount: number;
      date: Date;
      category: string;
      kind: "variable" | "fixed";
      recurring: boolean;
      isTemplate: boolean;
      validFrom: Date;
      validTo: Date | null;
      createdAt?: Date;
      updatedAt?: Date;
    };
    const combined: ERow[] = [...(nonT as ERow[]), ...(templateDocs as ERow[])].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const entries: ExpenseRow[] = [];
    for (const e of combined) {
      if (e.isTemplate && e.recurring) {
        const rowStart = startOfMonth(new Date(year, month - 1, 1));
        entries.push({
          ...serialize(e),
          rowKind: "recurring",
          displayDate: rowStart.toISOString(),
        });
      } else if (!e.isTemplate) {
        entries.push({
          ...serialize(e),
          rowKind: e.kind === "fixed" ? "fixed_once" : "variable",
        });
      }
    }

    return NextResponse.json({ data: entries });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
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
    } = body;
    const projectName =
      typeof projectNameRaw === "string" ? projectNameRaw.trim().slice(0, 200) : "";
    if (!title || amount == null) {
      return NextResponse.json(
        { error: "title and amount are required" },
        { status: 400 }
      );
    }
    const cat = (category as string) || "general";
    const k = kind === "fixed" ? "fixed" : "variable";
    const isTpl = Boolean(isTemplate) && Boolean(recurring);

    if (isTpl) {
      if (!validFrom) {
        return NextResponse.json(
          { error: "validFrom is required for recurring fixed expenses" },
          { status: 400 }
        );
      }
      const vf = new Date(validFrom);
      const vt = validTo ? new Date(validTo) : null;
      await connectDB();
      const doc = await Expense.create({
        userId: user.id,
        title: String(title),
        amount: Number(amount),
        date: vf,
        category: cat,
        kind: "fixed",
        recurring: true,
        isTemplate: true,
        validFrom: vf,
        validTo: vt,
        projectName,
      });
      const uid = String(user.id);
      queueAfterExpense(uid, "created", {
        title: String(title),
        amount: Number(amount),
      });
      return NextResponse.json(
        { data: { ...doc.toObject(), _id: String(doc._id) } },
        { status: 201 }
      );
    }

    if (!date) {
      return NextResponse.json({ error: "date is required" }, { status: 400 });
    }
    const dt = new Date(date);
    await connectDB();
    const doc = await Expense.create({
      userId: user.id,
      title: String(title),
      amount: Number(amount),
      date: dt,
      category: cat,
      kind: k,
      recurring: false,
      isTemplate: false,
      validFrom: dt,
      validTo: null,
      projectName,
    });
    const uid = String(user.id);
    queueAfterExpense(uid, "created", {
      title: String(title),
      amount: Number(amount),
    });
    return NextResponse.json(
      { data: { ...doc.toObject(), _id: String(doc._id) } },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
