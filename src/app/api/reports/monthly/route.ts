import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { buildMonthlyReport } from "@/lib/build-monthly-report";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const y = Number(searchParams.get("year"));
    const m = Number(searchParams.get("month"));
    if (!y || !m || m < 1 || m > 12) {
      return NextResponse.json(
        { error: "Query params year and month (1-12) are required" },
        { status: 400 }
      );
    }
    await connectDB();
    const data = await buildMonthlyReport(y, m);
    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
