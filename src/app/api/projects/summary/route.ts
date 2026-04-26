import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Project } from "@/lib/models";
import { monthDateBoundsUTC } from "@/lib/db-month-filters";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";

/**
 * Pre-aggregated name → total for project P&L / by-name card without loading every project row in the client.
 */
export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const yearQ = searchParams.get("year");
    const monthQ = searchParams.get("month");
    await connectDB();
    const userId = new mongoose.Types.ObjectId(user.id);
    const match: Record<string, unknown> = { userId };
    if (yearQ != null && monthQ != null) {
      const y = Number(yearQ);
      const m = Number(monthQ);
      if (!y || m < 1 || m > 12) {
        return NextResponse.json(
          { error: "Query params year and month (1-12) are required when filtering" },
          { status: 400 }
        );
      }
      const { mStart, mEnd } = monthDateBoundsUTC(y, m);
      match.date = { $gte: mStart, $lte: mEnd };
    }
    const byName = await Project.aggregate<{
      _id: string;
      total: number;
    }>([
      { $match: match },
      {
        $group: {
          _id: "$name",
          total: { $sum: "$amount" },
        },
      },
      { $sort: { total: -1 } },
    ]);
    const totalSum =
      byName.length > 0
        ? byName.reduce((s, r) => s + r.total, 0)
        : 0;
    return NextResponse.json({
      data: {
        byName: byName.map((r) => ({ name: r._id, total: r.total })),
        totalAmount: totalSum,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
