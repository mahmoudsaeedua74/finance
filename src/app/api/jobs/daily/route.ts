import { authorizeJobs } from "@/lib/jobs-auth";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { runDailyJobs } from "@/lib/services/jobs-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!authorizeJobs(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const data = await runDailyJobs();
  return NextResponse.json({ data });
}

/** Vercel cron & manual GET; same auth as POST. */
export async function GET(req: Request) {
  if (!authorizeJobs(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await connectDB();
  const data = await runDailyJobs();
  return NextResponse.json({ data });
}
