import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { getBudgetUsage } from "@/lib/services/budget-usage-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  const { searchParams } = new URL(req.url);
  const year = Number(searchParams.get("year"));
  const month = Number(searchParams.get("month"));
  if (!year || !month || month < 1 || month > 12) {
    return NextResponse.json({ error: "year and month are required" }, { status: 400 });
  }
  await connectDB();
  const usage = await getBudgetUsage(user.id, year, month);
  return NextResponse.json({ data: usage });
}
