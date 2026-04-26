import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models";
import { runDailyJobs } from "@/lib/services/jobs-service";
import { materializeRecurringIncomes } from "@/lib/services/recurring-income-service";

export async function runMonthlyAutomation() {
  await connectDB();
  const users = await User.find().lean();
  for (const u of users) {
    await materializeRecurringIncomes(String(u._id));
  }
  await runDailyJobs();
}
