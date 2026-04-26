import { subDays, subMonths } from "date-fns";
import {
  EmailDigestState,
  Expense,
  Income,
  Notification,
  NotificationPreference,
  User,
} from "@/lib/models";
import { buildMonthlyReport } from "@/lib/build-monthly-report";
import { getBudgetUsage } from "@/lib/services/budget-usage-service";
import { notifyOnce } from "@/lib/services/notification-service";
import { materializeRecurringIncomes } from "@/lib/services/recurring-income-service";
import { renderDigestEmail } from "@/lib/email/templates/digest";
import { renderMirrorNotificationEmail } from "@/lib/email/templates/mirror-notification";
import { sendEmail, isSmtpConfigured } from "@/lib/services/email-service";

const appName = () => process.env.EMAIL_APP_NAME || "Personal Finance";

type Prefs = {
  nearBudgetThresholdPct: number;
  inactivityDays: number;
  mirrorInAppToEmail: boolean;
  noLoginReminderEmail: boolean;
  inactivityNudgeEmail: boolean;
  netDecreaseEmail: boolean;
  digestEnabled: boolean;
  digestCadence: "daily" | "weekly";
  criticalEmailEnabled: boolean;
};

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function loadPrefs(userId: string): Promise<Prefs> {
  const p = await NotificationPreference.findOne({ userId }).lean();
  return {
    nearBudgetThresholdPct: p?.nearBudgetThresholdPct ?? 80,
    inactivityDays: p?.inactivityDays ?? 5,
    mirrorInAppToEmail: p?.mirrorInAppToEmail !== false,
    noLoginReminderEmail: p?.noLoginReminderEmail !== false,
    inactivityNudgeEmail: p?.inactivityNudgeEmail !== false,
    netDecreaseEmail: p?.netDecreaseEmail !== false,
    digestEnabled: p?.digestEmailEnabled !== false,
    digestCadence: p?.digestCadence || "weekly",
    criticalEmailEnabled: p?.criticalEmailEnabled !== false,
  };
}

/** Create in-app notification and optionally copy to email. */
async function notifyMirrorEmail(
  u: { _id: unknown; email: string },
  prefs: Prefs,
  input: {
    type: string;
    severity: "info" | "warning" | "critical";
    title: string;
    body: string;
    dedupKey: string;
    dedupWindowHours?: number;
    skipEmail?: boolean;
  }
) {
  const row = await notifyOnce({
    userId: String(u._id),
    type: input.type,
    severity: input.severity,
    title: input.title,
    body: input.body,
    dedupKey: input.dedupKey,
    dedupWindowHours: input.dedupWindowHours,
  });
  if (input.skipEmail) return row;
  if (!prefs.mirrorInAppToEmail) return row;
  if (!isSmtpConfigured()) return row;
  const tpl = renderMirrorNotificationEmail({
    appName: appName(),
    title: input.title,
    body: input.body,
    severity: input.severity,
  });
  const subject = `${appName()}: ${input.title}`;
  await sendEmail({ to: u.email, subject, html: tpl.html, text: tpl.text });
  return row;
}

export async function runDailyJobs() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const startTodayUtc = startOfUtcDay(now);

  const users = await User.find().lean();

  for (const u of users) {
    const uid = String(u._id);
    const email = u.email;
    const prefs = await loadPrefs(uid);

    const firstThisMonth = new Date(y, m - 1, 1);
    const firstLastMonth = subMonths(firstThisMonth, 1);
    const yLm = firstLastMonth.getFullYear();
    const mLm = firstLastMonth.getMonth() + 1;
    const firstTwoAgo = subMonths(firstLastMonth, 1);
    const yT = firstTwoAgo.getFullYear();
    const mT = firstTwoAgo.getMonth() + 1;

    if (prefs.netDecreaseEmail) {
      const rLast = await buildMonthlyReport(yLm, mLm, uid);
      const rPrev = await buildMonthlyReport(yT, mT, uid);
      if (rLast.summary.netBalance < rPrev.summary.netBalance) {
        const diff = (rPrev.summary.netBalance - rLast.summary.netBalance).toFixed(2);
        await notifyMirrorEmail(
          { _id: u._id, email },
          prefs,
          {
            type: "finance.net_lower",
            severity: "warning",
            title: "Net balance dropped vs prior month",
            body: `Last month (${yLm}-${String(mLm).padStart(2, "0")}) net was ${rLast.summary.netBalance.toFixed(2)} vs ${rPrev.summary.netBalance.toFixed(2)} the month before (about ${diff} lower).`,
            dedupKey: `net-fell-${yLm}-${mLm}-vs-${yT}-${mT}`,
            dedupWindowHours: 24 * 32,
          }
        );
      }
    }

    if (prefs.noLoginReminderEmail) {
      const created = u.createdAt ? new Date(u.createdAt) : new Date(0);
      const accountAgeH = (now.getTime() - created.getTime()) / 3600_000;
      const last = u.lastLoginAt ? new Date(u.lastLoginAt) : null;
      const hasLoggedInToday = last && last >= startTodayUtc;
      if (accountAgeH > 12 && !hasLoggedInToday) {
        const key = `nologin-${startTodayUtc.toISOString().slice(0, 10)}`;
        await notifyMirrorEmail(
          { _id: u._id, email },
          prefs,
          {
            type: "auth.no_login_today",
            severity: "info",
            title: "You have not signed in today",
            body: "Open the app to review your month and stay on top of spending.",
            dedupKey: key,
            dedupWindowHours: 26,
          }
        );
      }
    }

    const usage = await getBudgetUsage(uid, y, m);
    for (const row of usage.rows) {
      const thresh = Math.min(100, Math.max(1, prefs.nearBudgetThresholdPct));
      if (row.percentage >= 100) {
        const title = "Over budget";
        const body = `${row.category} exceeded the limit (${row.percentage.toFixed(0)}% used).`;
        if (prefs.criticalEmailEnabled) {
          await notifyMirrorEmail(
            { _id: u._id, email },
            prefs,
            {
              type: "budget.over",
              severity: "critical",
              title,
              body,
              dedupKey: `budget-over-${usage.monthKey}-${row.category}`,
              dedupWindowHours: 24,
            }
          );
        } else {
          await notifyOnce({
            userId: uid,
            type: "budget.over",
            severity: "critical",
            title,
            body,
            dedupKey: `budget-over-${usage.monthKey}-${row.category}`,
            dedupWindowHours: 24,
          });
        }
      } else if (row.percentage >= thresh) {
        const title = "Budget warning";
        const body = `${row.category} is at ${row.percentage.toFixed(0)}% of the limit (alerts at ${thresh}%).`;
        await notifyMirrorEmail(
          { _id: u._id, email },
          prefs,
          {
            type: "budget.near_limit",
            severity: "warning",
            title,
            body,
            dedupKey: `budget-warn-${usage.monthKey}-${row.category}`,
            dedupWindowHours: 24,
          }
        );
      }
    }

    const since = subDays(now, prefs.inactivityDays);
    const anyActivity = await Promise.all([
      Income.exists({ userId: uid, createdAt: { $gte: since } }),
      Expense.exists({ userId: uid, createdAt: { $gte: since } }),
    ]);
    if (!anyActivity[0] && !anyActivity[1] && prefs.inactivityNudgeEmail) {
      await notifyMirrorEmail(
        { _id: u._id, email },
        prefs,
        {
          type: "behavior.inactive",
          severity: "warning",
          title: "No new entries",
          body: `No new income or expense in the last ${prefs.inactivityDays} days.`,
          dedupKey: `inactive-${prefs.inactivityDays}d`,
          dedupWindowHours: 24,
        }
      );
    }

    await materializeRecurringIncomes(uid, now);

    const digestState = await EmailDigestState.findOne({ userId: uid }).lean();
    const digestIntervalMs = prefs.digestCadence === "daily" ? 24 * 3600_000 : 7 * 24 * 3600_000;
    const shouldSendDigest =
      prefs.digestEnabled &&
      (!digestState?.lastSentAt ||
        Date.now() - new Date(digestState.lastSentAt).getTime() > digestIntervalMs);
    if (shouldSendDigest) {
      const monthIncome = await Income.find({
        userId: uid,
        date: { $gte: new Date(y, m - 1, 1), $lte: new Date(y, m, 0) },
      }).lean();
      const monthExpense = await Expense.find({
        userId: uid,
        isTemplate: false,
        date: { $gte: new Date(y, m - 1, 1), $lte: new Date(y, m, 0) },
      }).lean();
      const totalSpent = monthExpense.reduce((s, e) => s + e.amount, 0);
      const monthIncTotal = monthIncome.reduce((s, i) => s + i.amount, 0);
      const remaining = monthIncTotal - totalSpent;
      const digest = renderDigestEmail({
        appName: appName(),
        totalSpent,
        remainingBalance: remaining,
        warnings: usage.rows
          .filter((r) => r.status !== "safe")
          .map((r) => `${r.category}: ${r.percentage.toFixed(0)}% used`),
        insights: [
          `Calendar month: ${y}-${String(m).padStart(2, "0")} · Cadence: ${prefs.digestCadence}`,
        ],
      });
      if (isSmtpConfigured()) {
        const sent = await sendEmail({
          to: email,
          subject: `${appName()} — ${prefs.digestCadence} digest`,
          html: digest.html,
          text: digest.text,
        });
        if (sent.sent) {
          await EmailDigestState.findOneAndUpdate(
            { userId: uid },
            {
              $set: { lastSentAt: new Date(), cadence: prefs.digestCadence },
            },
            { upsert: true }
          );
        }
      }
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
    const uid = String(u._id);
    const email = u.email;
    const prefs = await loadPrefs(uid);
    const hasIncome = await Income.exists({
      userId: uid,
      date: { $gte: new Date(y, m - 1, 1), $lte: new Date(y, m, 0) },
    });
    if (!hasIncome) {
      await notifyMirrorEmail(
        { _id: u._id, email },
        prefs,
        {
          type: "income.missing_month",
          severity: "warning",
          title: "No income recorded for this month",
          body: "Add at least one income line so the monthly picture is complete.",
          dedupKey: `missing-income-${y}-${m}`,
          dedupWindowHours: 24 * 14,
        }
      );
    }
    await EmailDigestState.findOneAndUpdate(
      { userId: uid },
      { $setOnInsert: { cadence: "weekly" } },
      { upsert: true }
    );
  }
  return { ok: true };
}

export async function getUnreadNotificationsCount(userId: string) {
  return Notification.countDocuments({ userId, readAt: null });
}
