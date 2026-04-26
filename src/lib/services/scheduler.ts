import cron from "node-cron";
import { connectDB } from "@/lib/mongodb";
import { runDailyJobs, runMonthlyJobs } from "@/lib/services/jobs-service";

let started = false;

export function startSchedulers() {
  if (started || process.env.NODE_ENV === "test") return;
  started = true;

  cron.schedule("5 2 * * *", async () => {
    await connectDB();
    await runDailyJobs();
  });

  cron.schedule("20 3 1 * *", async () => {
    await connectDB();
    await runMonthlyJobs();
  });
}
