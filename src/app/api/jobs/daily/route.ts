import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { runDailyJobs } from "@/lib/services/jobs-service";

export const dynamic = "force-dynamic";

function authorizeJobs(req: Request) {
  const jobSecret = process.env.JOBS_SECRET;
  if (!jobSecret) return false;
  if (req.headers.get("x-jobs-secret") === jobSecret) return true;
  const auth = req.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (bearer && (bearer === jobSecret || (process.env.CRON_SECRET && bearer === process.env.CRON_SECRET)))
    return true;
  return false;
}

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
