import cron from "node-cron";
import { connectDB } from "@/lib/mongodb";
import { runDailyJobs, runMonthlyJobs } from "@/lib/services/jobs-service";

let started = false;

export function startSchedulers() {
  if (started || process.env.NODE_ENV === "test") return;
  started = true;

  /** Hourly UTC 08–21 → aligns with Cairo +2 «10–23» login-reminder window (see LOGIN_REMINDER_* env). */
  cron.schedule("5 8-21 * * *", async () => {
    await connectDB();
    await runDailyJobs();
  });

  cron.schedule("20 3 1 * *", async () => {
    await connectDB();
    await runMonthlyJobs();
  });
}
