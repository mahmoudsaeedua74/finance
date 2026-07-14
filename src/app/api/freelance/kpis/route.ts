import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { getFreelanceKpis } from "@/lib/services/freelance-kpi-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const year = searchParams.get("year")
      ? parseInt(searchParams.get("year")!, 10)
      : now.getFullYear();
    const month = searchParams.get("month")
      ? parseInt(searchParams.get("month")!, 10)
      : now.getMonth() + 1;
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Invalid year/month" }, { status: 400 });
    }
    const data = await getFreelanceKpis(user.id, year, month);
    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
