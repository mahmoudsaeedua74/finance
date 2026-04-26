import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Expense, Project } from "@/lib/models";
import { monthDateBoundsUTC } from "@/lib/db-month-filters";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

type PlRow = {
  key: string;
  label: string;
  received: number;
  spent: number;
  net: number;
};

/**
 * Server-side P&L by project for the month (replaces client merge of paged `projects` + `expenses` lists).
 */
export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const y = Number(searchParams.get("year"));
    const m = Number(searchParams.get("month"));
    if (!y || m < 1 || m > 12) {
      return NextResponse.json(
        { error: "Query params year and month (1-12) are required" },
        { status: 400 }
      );
    }
    await connectDB();
    const uid = new mongoose.Types.ObjectId(user.id);
    const { mStart, mEnd } = monthDateBoundsUTC(y, m);
    const [receivedAgg, expNon, expTpl] = await Promise.all([
      Project.aggregate<{ _id: string; n: string; amount: number }>([
        {
          $match: {
            userId: uid,
            date: { $gte: mStart, $lte: mEnd },
          },
        },
        {
          $group: {
            _id: { $toLower: { $trim: { input: "$name" } } },
            n: { $first: { $trim: { input: "$name" } } },
            amount: { $sum: "$amount" },
          },
        },
      ]),
      Expense.aggregate<{ _id: string; p: string; amount: number }>([
        {
          $match: {
            userId: uid,
            isTemplate: false,
            date: { $gte: mStart, $lte: mEnd },
            projectName: { $exists: true, $ne: "" },
          },
        },
        { $addFields: { pnorm: { $toLower: { $trim: { input: "$projectName" } } } } },
        { $group: { _id: "$pnorm", p: { $first: { $trim: { input: "$projectName" } } }, amount: { $sum: "$amount" } } },
      ]),
      Expense.aggregate<{ _id: string; p: string; amount: number }>([
        {
          $match: {
            userId: uid,
            isTemplate: true,
            recurring: true,
            validFrom: { $lte: mEnd },
            $or: [{ validTo: null }, { validTo: { $gte: mStart } }],
            projectName: { $exists: true, $ne: "" },
          },
        },
        { $addFields: { pnorm: { $toLower: { $trim: { input: "$projectName" } } } } },
        { $group: { _id: "$pnorm", p: { $first: { $trim: { input: "$projectName" } } }, amount: { $sum: "$amount" } } },
      ]),
    ]);
    const receivedByKey = new Map<string, { amount: number; display: string }>();
    for (const r of receivedAgg) {
      const k = r._id;
      if (!k) continue;
      receivedByKey.set(k, { amount: r.amount, display: r.n || k });
    }
    const spendByKey = new Map<string, { amount: number; display: string }>();
    const addSp = (a: { _id: string; p: string; amount: number }[]) => {
      for (const r of a) {
        const k = r._id;
        if (!k) continue;
        const prev = spendByKey.get(k);
        const display = prev?.display ?? r.p;
        spendByKey.set(k, { amount: (prev?.amount ?? 0) + r.amount, display });
      }
    };
    addSp(expNon);
    addSp(expTpl);
    const keys = new Set([...receivedByKey.keys(), ...spendByKey.keys()]);
    const rows: PlRow[] = [];
    for (const k of keys) {
      const rec = receivedByKey.get(k);
      const sp = spendByKey.get(k);
      const label = rec?.display ?? sp?.display ?? k;
      const received = rec?.amount ?? 0;
      const spent = sp?.amount ?? 0;
      rows.push({ key: k, label, received, spent, net: received - spent });
    }
    rows.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    return NextResponse.json({ data: { rows } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
