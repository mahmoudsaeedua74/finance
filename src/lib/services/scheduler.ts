import cron from "node-cron";
import { connectDB } from "@/lib/mongodb";
import { runDailyJobs, runMonthlyJobs } from "@/lib/services/jobs-service";

let started = false;

export function startSchedulers() {
  if (started || process.env.NODE_ENV === "test") return;
  started = true;

  /** Once daily UTC ~09:05 (aligns with Cairo «10–23» reminder window). Vercel Hobby allows only daily crons; production uses vercel.json. */
  cron.schedule("5 9 * * *", async () => {
    await connectDB();
    await runDailyJobs();
  });

  cron.schedule("20 3 1 * *", async () => {
    await connectDB();
    await runMonthlyJobs();
  });
}
