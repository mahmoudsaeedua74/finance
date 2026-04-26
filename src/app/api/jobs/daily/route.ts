import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { runDailyJobs } from "@/lib/services/jobs-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const secret = process.env.JOBS_SECRET;
  const sent = req.headers.get("x-jobs-secret");
  if (!secret || sent !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const data = await runDailyJobs();
  return NextResponse.json({ data });
}
