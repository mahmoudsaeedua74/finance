import { subDays } from "date-fns";
import { EmailDigestState, Expense, Income, Notification, User } from "@/lib/models";
import { getBudgetUsage } from "@/lib/services/budget-usage-service";
import { notifyOnce } from "@/lib/services/notification-service";
import { materializeRecurringIncomes } from "@/lib/services/recurring-income-service";
import { renderCriticalAlertEmail } from "@/lib/email/templates/critical-alert";
import { renderDigestEmail } from "@/lib/email/templates/digest";
import { sendEmail } from "@/lib/services/email-service";

export async function runDailyJobs() {
  const users = await User.find().lean();
  for (const u of users) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;

    const usage = await getBudgetUsage(String(u._id), y, m);
    for (const row of usage.rows) {
      if (row.percentage >= 100) {
        const title = "Over budget";
        const body = `${row.category} exceeded budget (${row.percentage.toFixed(0)}%).`;
        await notifyOnce({
          userId: String(u._id),
          type: "budget.over",
          severity: "critical",
          title,
          body,
          dedupKey: `budget-over-${usage.monthKey}-${row.category}`,
          dedupWindowHours: 24,
        });
        const critical = renderCriticalAlertEmail({
          title,
          body,
          appName: process.env.EMAIL_APP_NAME || "Personal Finance",
        });
        await sendEmail({
          to: u.email,
          subject: `${process.env.EMAIL_APP_NAME || "Personal Finance"}: ${title}`,
          html: critical.html,
          text: critical.text,
        });
      } else if (row.percentage >= 80) {
        await notifyOnce({
          userId: String(u._id),
          type: "budget.near_limit",
          severity: "warning",
          title: "Budget warning",
          body: `${row.category} reached ${row.percentage.toFixed(0)}% of budget.`,
          dedupKey: `budget-warning-${usage.monthKey}-${row.category}`,
          dedupWindowHours: 24,
        });
      }
    }

    const since = subDays(now, 5);
    const anyActivity = await Promise.all([
      Income.exists({ userId: String(u._id), createdAt: { $gte: since } }),
      Expense.exists({ userId: String(u._id), createdAt: { $gte: since } }),
    ]);
    if (!anyActivity[0] && !anyActivity[1]) {
      await notifyOnce({
        userId: String(u._id),
        type: "behavior.inactive",
        severity: "warning",
        title: "No recent entries",
        body: "No new income or expense entries in the last 5 days.",
        dedupKey: "inactive-5-days",
        dedupWindowHours: 24,
      });
    }

    await materializeRecurringIncomes(String(u._id), now);

    const digestState = await EmailDigestState.findOne({ userId: String(u._id) }).lean();
    const shouldSendWeekly =
      !digestState?.lastSentAt ||
      Date.now() - new Date(digestState.lastSentAt).getTime() > 7 * 24 * 3600 * 1000;
    if (shouldSendWeekly) {
      const monthIncome = await Income.find({
        userId: String(u._id),
        date: { $gte: new Date(y, m - 1, 1), $lte: new Date(y, m, 0) },
      }).lean();
      const monthExpense = await Expense.find({
        userId: String(u._id),
        isTemplate: false,
        date: { $gte: new Date(y, m - 1, 1), $lte: new Date(y, m, 0) },
      }).lean();
      const totalSpent = monthExpense.reduce((s, e) => s + e.amount, 0);
      const remaining = monthIncome.reduce((s, i) => s + i.amount, 0) - totalSpent;
      const digest = renderDigestEmail({
        appName: process.env.EMAIL_APP_NAME || "Personal Finance",
        totalSpent,
        remainingBalance: remaining,
        warnings: usage.rows
          .filter((r) => r.status !== "safe")
          .map((r) => `${r.category}: ${r.percentage.toFixed(0)}% used`),
        insights: [],
      });
      await sendEmail({
        to: u.email,
        subject: `${process.env.EMAIL_APP_NAME || "Personal Finance"} weekly digest`,
        html: digest.html,
        text: digest.text,
      });
      await EmailDigestState.findOneAndUpdate(
        { userId: String(u._id) },
        {
          $set: { lastSentAt: new Date() },
          $setOnInsert: { cadence: "weekly" },
        },
        { upsert: true }
      );
    }
  }
  return { ok: true };
}

export async function runMonthlyJobs() {
  const users = await User.find().lean();
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  for (const u of users) {
    const hasIncome = await Income.exists({
      userId: String(u._id),
      date: { $gte: new Date(y, m - 1, 1), $lte: new Date(y, m, 0) },
    });
    if (!hasIncome) {
      await notifyOnce({
        userId: String(u._id),
        type: "income.missing_month",
        severity: "warning",
        title: "Missing monthly income",
        body: "No income has been recorded for this month yet.",
        dedupKey: `missing-income-${y}-${m}`,
        dedupWindowHours: 24 * 14,
      });
    }
    await EmailDigestState.findOneAndUpdate(
      { userId: String(u._id) },
      { $setOnInsert: { cadence: "weekly" } },
      { upsert: true }
    );
  }
  return { ok: true };
}

export async function getUnreadNotificationsCount(userId: string) {
  return Notification.countDocuments({ userId, readAt: null });
}

