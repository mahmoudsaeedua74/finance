import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { buildYearlyReport } from "@/lib/build-yearly-report";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const y = Number(searchParams.get("year"));
    if (!y || y < 2000 || y > 2100) {
      return NextResponse.json(
        { error: "Query param year is required" },
        { status: 400 }
      );
    }
    await connectDB();
    const data = await buildYearlyReport(y, user.id);
    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
