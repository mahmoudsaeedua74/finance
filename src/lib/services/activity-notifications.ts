import { Notification, NotificationPreference } from "@/lib/models";
import { buildMonthlyReport } from "@/lib/build-monthly-report";
import { notifyOnce } from "@/lib/services/notification-service";

async function activityEnabled(userId: string): Promise<boolean> {
  const p = await NotificationPreference.findOne({ userId }).lean();
  return p?.activityNotificationsEnabled !== false;
}

/**
 * In-app feed item for income / expense / project changes (no email).
 */
export async function notifyIncomeActivity(
  userId: string,
  action: "created" | "updated" | "deleted",
  detail: { title: string; amount: number }
) {
  if (!(await activityEnabled(userId))) return;
  const a = action === "created" ? "Added" : action === "updated" ? "Updated" : "Removed";
  await Notification.create({
    userId,
    type: `income.${action}`,
    severity: "info",
    title: `${a} income`,
    body: `${detail.title} — ${detail.amount.toFixed(2)}`,
  });
}

export async function notifyExpenseActivity(
  userId: string,
  action: "created" | "updated" | "deleted",
  detail: { title: string; amount: number }
) {
  if (!(await activityEnabled(userId))) return;
  const a = action === "created" ? "Added" : action === "updated" ? "Updated" : "Removed";
  await Notification.create({
    userId,
    type: `expense.${action}`,
    severity: "info",
    title: `${a} expense`,
    body: `${detail.title} — ${detail.amount.toFixed(2)}`,
  });
}

export async function notifyProjectActivity(
  userId: string,
  action: "created" | "updated" | "deleted",
  detail: { name: string; amount: number }
) {
  if (!(await activityEnabled(userId))) return;
  const a = action === "created" ? "Added" : action === "updated" ? "Updated" : "Removed";
  await Notification.create({
    userId,
    type: `project.${action}`,
    severity: "info",
    title: `${a} project payout`,
    body: `${detail.name} — ${detail.amount.toFixed(2)}`,
  });
}

/**
 * When month net balance is below the user’s threshold, one in-app alert per calendar day (deduped).
 * Threshold: `null` or `<= 0` in preferences = disabled.
 */
export async function maybeNotifyLowNetBalance(userId: string) {
  const p = await NotificationPreference.findOne({ userId }).lean();
  const threshold = p?.lowBalanceThreshold;
  if (threshold == null || Number(threshold) <= 0) return;

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const r = await buildMonthlyReport(y, m, userId);
  const net = r.summary.netBalance;
  if (net >= threshold) return;

  const dayKey = now.toISOString().slice(0, 10);
  await notifyOnce({
    userId,
    type: "finance.low_net_threshold",
    severity: "warning",
    title: "Month net below your limit",
    body: `This month’s net is ${net.toFixed(2)} (your alert is when it’s below ${threshold.toFixed(2)}).`,
    dedupKey: `low-net-thresh-${y}-${m}-${dayKey}`,
    dedupWindowHours: 24,
  });
}

/**
 * Run after DB write — do not await in API routes: `buildMonthlyReport` in low-balance check is too slow
 * to block the HTTP response (was causing multi-second “saving” for users).
 */
export function queueAfterExpense(
  userId: string,
  action: "created" | "updated" | "deleted",
  detail: { title: string; amount: number }
) {
  void (async () => {
    try {
      await notifyExpenseActivity(userId, action, detail);
      await maybeNotifyLowNetBalance(userId);
    } catch (e) {
      console.error("queueAfterExpense", e);
    }
  })();
}

export function queueAfterIncome(
  userId: string,
  action: "created" | "updated" | "deleted",
  detail: { title: string; amount: number }
) {
  void (async () => {
    try {
      await notifyIncomeActivity(userId, action, detail);
      await maybeNotifyLowNetBalance(userId);
    } catch (e) {
      console.error("queueAfterIncome", e);
    }
  })();
}

export function queueAfterProject(
  userId: string,
  action: "created" | "updated" | "deleted",
  detail: { name: string; amount: number }
) {
  void (async () => {
    try {
      await notifyProjectActivity(userId, action, detail);
      await maybeNotifyLowNetBalance(userId);
    } catch (e) {
      console.error("queueAfterProject", e);
    }
  })();
}
