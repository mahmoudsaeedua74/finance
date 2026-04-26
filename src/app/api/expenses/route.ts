import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Expense } from "@/lib/models";
import { isDateInMonth, templateAppliesInMonth } from "@/lib/monthly";
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
    const all = await Expense.find({ userId: user.id }).sort({ date: -1 }).lean();
    if (yearQ == null || monthQ == null) {
      return NextResponse.json({
        data: all.map((d) => ({
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
    const entries: ExpenseRow[] = [];

    for (const d of all) {
      const e = d as {
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
      if (e.isTemplate && e.recurring) {
        if (templateAppliesInMonth(new Date(e.validFrom), e.validTo, year, month)) {
          const mStart = startOfMonth(new Date(year, month - 1, 1));
          entries.push({
            ...serialize(e),
            rowKind: "recurring",
            displayDate: mStart.toISOString(),
          });
        }
        continue;
      }
      if (!e.isTemplate && isDateInMonth(new Date(e.date), year, month)) {
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
    } = body;
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
