import { subDays, subMonths } from "date-fns";
import {
  EmailDigestState,
  Expense,
  FreelanceProject,
  Income,
  Notification,
  NotificationPreference,
  Project,
  User,
} from "@/lib/models";
import { buildMonthlyReport } from "@/lib/build-monthly-report";
import { templateAppliesInMonth } from "@/lib/monthly";
import {
  addOneCivilDay,
  defaultDueDayFromValidFrom,
  effectiveDueDayInMonth,
  getYMDInTimeZone,
  getRecurringDueTimezone,
} from "@/lib/due-day-of-month";
import type { NotificationSeverity } from "@/lib/models";
import { notifyOnce } from "@/lib/services/notification-service";
import { maybeNotifyLowNetBalance } from "@/lib/services/activity-notifications";
import { materializeRecurringIncomes } from "@/lib/services/recurring-income-service";
import { renderDigestEmail } from "@/lib/email/templates/digest";
import { renderLoginReminderEmail } from "@/lib/email/templates/login-reminder-email";
import { renderMonthlyClosingEmail } from "@/lib/email/templates/monthly-closing";
import { renderMirrorNotificationEmail } from "@/lib/email/templates/mirror-notification";
import { sendEmail, isEmailConfigured } from "@/lib/services/email-service";
import { getHourAndDateKeyInZone } from "@/lib/timezone-utils";
import { monthlyReportPdfToBuffer } from "@/lib/monthly-report-pdf";
import type { MonthlyReportDto } from "@/types/report";

const appName = () => process.env.EMAIL_APP_NAME || "Personal Finance";

const MS_24H = 24 * 60 * 60 * 1000;

function clampReminderHour(n: number, fallback: number) {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(23, Math.max(0, Math.round(n)));
}

/**
 * Email + in-app when user had no dashboard/session ping for ≥24h.
 * Sends only during local wall-clock hours [start,end] (default 10–23 in LOGIN_REMINDER_TIMEZONE).
 * Email bypasses «mirror to email» — dedicated reminder when preference is on.
 */
async function maybeNotifyDailyLoginReminder(
  u: {
    _id: unknown;
    email: string;
    name?: string;
    createdAt?: Date;
    lastLoginAt?: Date | null;
  },
  prefs: Prefs,
  now: Date
) {
  if (!prefs.noLoginReminderEmail) return;

  const tz = process.env.LOGIN_REMINDER_TIMEZONE?.trim() || "Africa/Cairo";
  const startH = clampReminderHour(Number(process.env.LOGIN_REMINDER_START_HOUR ?? 10), 10);
  const endH = clampReminderHour(Number(process.env.LOGIN_REMINDER_END_HOUR ?? 23), 23);
  const { hour, dateKey } = getHourAndDateKeyInZone(now, tz);
  if (hour < startH || hour > endH) return;

  const uid = String(u._id);
  const createdAt = u.createdAt ? new Date(u.createdAt) : new Date(0);
  const last = u.lastLoginAt ? new Date(u.lastLoginAt) : null;
  const accountReady = now.getTime() - createdAt.getTime() >= MS_24H;
  const inactive24 =
    last == null ? accountReady : now.getTime() - last.getTime() >= MS_24H;
  if (!inactive24) return;

  const dedupKey = `login-reminder-${dateKey}-${uid}`;
  const hoursSinceActivity = last ? (now.getTime() - last.getTime()) / 3600_000 : undefined;

  const row = await notifyOnce({
    userId: uid,
    type: "auth.no_login_recent",
    severity: "info",
    title: "لم نر نشاطًا من التطبيق منذ ٢٤ ساعة",
    body: "افتح التطبيق لمتابعة دخلك ومصروفاتك ورؤيتك السريعة.",
    dedupKey,
    dedupWindowHours: 48,
  });

  const createdMs = row.createdAt ? new Date(row.createdAt).getTime() : now.getTime();
  if (now.getTime() - createdMs > 120_000) return;

  if (!isEmailConfigured()) return;

  const tpl = renderLoginReminderEmail({
    appName: appName(),
    userName: typeof u.name === "string" ? u.name : undefined,
    hoursSinceActivity,
  });
  await sendEmail({
    to: u.email,
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
  });
}

type Prefs = {
  inactivityDays: number;
  mirrorInAppToEmail: boolean;
  noLoginReminderEmail: boolean;
  inactivityNudgeEmail: boolean;
  netDecreaseEmail: boolean;
  digestEnabled: boolean;
  digestCadence: "daily" | "weekly";
  criticalEmailEnabled: boolean;
  /** Monthly recurring “due day” in-app (and email if mirror on). */
  recurringDueRemindersEnabled: boolean;
  /** Project installments & expected payment date reminders. */
  projectPaymentRemindersEnabled: boolean;
};

async function loadPrefs(userId: string): Promise<Prefs> {
  const p = await NotificationPreference.findOne({ userId }).lean();
  return {
    inactivityDays: p?.inactivityDays ?? 5,
    mirrorInAppToEmail: p?.mirrorInAppToEmail !== false,
    noLoginReminderEmail: p?.noLoginReminderEmail !== false,
    inactivityNudgeEmail: p?.inactivityNudgeEmail !== false,
    netDecreaseEmail: p?.netDecreaseEmail !== false,
    digestEnabled: p?.digestEmailEnabled !== false,
    digestCadence: p?.digestCadence || "daily",
    criticalEmailEnabled: p?.criticalEmailEnabled !== false,
    recurringDueRemindersEnabled: p?.recurringDueRemindersEnabled !== false,
    projectPaymentRemindersEnabled: p?.projectPaymentRemindersEnabled !== false,
  };
}

/** Create in-app notification and optionally copy to email. */
async function notifyMirrorEmail(
  u: { _id: unknown; email: string },
  prefs: Prefs,
  input: {
    type: string;
    severity: NotificationSeverity;
    title: string;
    body: string;
    dedupKey: string;
    dedupWindowHours?: number;
    skipEmail?: boolean;
    meta?: Record<string, unknown>;
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
    meta: input.meta,
  });
  if (input.skipEmail) return row;
  if (!prefs.mirrorInAppToEmail) return row;
  if (!isEmailConfigured()) return row;
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

/**
 * (1) Day before: “due tomorrow” — amber in UI, email if mirror on.
 * (2) Due day: success/green in UI, email if mirror on.
 * Uses calendar days in `RECURRING_DUE_TIMEZONE` (see `getYMDInTimeZone` / `addOneCivilDay`).
 */
async function notifyRecurringDueDays(
  userId: string,
  u: { _id: unknown; email: string },
  prefs: Prefs,
  now: Date
) {
  if (prefs.recurringDueRemindersEnabled === false) return;
  const tz = getRecurringDueTimezone();
  const { y, m, d } = getYMDInTimeZone(now, tz);
  const tomorrow = addOneCivilDay(y, m, d);
  const templates = await Expense.find({ userId, isTemplate: true, recurring: true })
    .select({ validFrom: 1, validTo: 1, dueDayOfMonth: 1, title: 1, amount: 1 })
    .lean();
  for (const t of templates) {
    const titleS = t.title?.trim() || "Recurring expense";
    const amountStr = Number(t.amount).toFixed(2);
    const dom =
      t.dueDayOfMonth != null && t.dueDayOfMonth >= 1 && t.dueDayOfMonth <= 30
        ? t.dueDayOfMonth
        : defaultDueDayFromValidFrom(new Date(t.validFrom));

    const effTomorrow = effectiveDueDayInMonth(dom, tomorrow.y, tomorrow.m);
    if (
      templateAppliesInMonth(t.validFrom, t.validTo, tomorrow.y, tomorrow.m) &&
      tomorrow.d === effTomorrow
    ) {
      await notifyMirrorEmail(
        { _id: u._id, email: u.email },
        prefs,
        {
          type: "expense.recurring_due_soon",
          severity: "info",
          title: `غدًا الاستحقاق: ${titleS}`,
          body: `المبلغ الشهري ${amountStr} — الاستحقاق غدًا (${tomorrow.y}-${String(tomorrow.m).padStart(2, "0")}-${String(effTomorrow).padStart(2, "0")}, ${tz}). تذكير تتبع فقط، ليس سحبًا من البنك. · Due tomorrow: ${amountStr} — tracking reminder only, not a bank charge.`,
          dedupKey: `recurring-due-soon-${String(t._id)}-${tomorrow.y}-${tomorrow.m}-${effTomorrow}`,
          dedupWindowHours: 36,
        }
      );
    }

    if (!templateAppliesInMonth(t.validFrom, t.validTo, y, m)) continue;
    const effToday = effectiveDueDayInMonth(dom, y, m);
    if (d !== effToday) continue;
    await notifyMirrorEmail(
      { _id: u._id, email: u.email },
      prefs,
      {
        type: "expense.recurring_due",
        severity: "success",
        title: `اليوم: ${titleS} — تم (تتبع)`,
        body: `مبلغ ${amountStr} — يوم الاستحقاق (${y}-${String(m).padStart(2, "0")}-${String(effToday).padStart(2, "0")}, ${tz}). يمكنك اعتباره «مدفوعًا» في خطتك؛ تذكير تتبع فقط. · Due day — treat as settled in your plan; tracking only, not a bank charge.`,
        dedupKey: `recurring-due-${String(t._id)}-${y}-${m}`,
        dedupWindowHours: 36,
      }
    );
  }
}

function startOfUtcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function sameUtcDay(a: Date, b: Date) {
  return startOfUtcDay(a).getTime() === startOfUtcDay(b).getTime();
}

function formatYmd(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Remind on expectedPaymentDate and pending installment due dates (today + tomorrow).
 */
async function notifyProjectPaymentReminders(
  userId: string,
  u: { _id: unknown; email: string },
  prefs: Prefs,
  now: Date
) {
  if (prefs.projectPaymentRemindersEnabled === false) return;

  const today = startOfUtcDay(now);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const [jobs, installments] = await Promise.all([
    FreelanceProject.find({
      userId,
      status: { $in: ["pending", "partial"] },
      expectedPaymentDate: { $ne: null },
    })
      .select({ name: 1, clientName: 1, agreedAmount: 1, expectedPaymentDate: 1 })
      .lean(),
    Project.find({
      userId,
      isCollected: false,
      freelanceProjectId: { $ne: null },
    })
      .select({ name: 1, amount: 1, date: 1, freelanceProjectId: 1, note: 1 })
      .lean(),
  ]);

  for (const job of jobs) {
    const due = job.expectedPaymentDate ? new Date(job.expectedPaymentDate) : null;
    if (!due) continue;
    const label = job.clientName?.trim()
      ? `${job.name} (${job.clientName.trim()})`
      : job.name;
    const amountStr = Number(job.agreedAmount).toFixed(2);

    if (sameUtcDay(due, tomorrow)) {
      await notifyMirrorEmail(
        { _id: u._id, email: u.email },
        prefs,
        {
          type: "project.payment_due_soon",
          severity: "info",
          title: `غدًا موعد تحصيل: ${label}`,
          body: `المبلغ المتوقع ${amountStr} — ${formatYmd(tomorrow)}. · Payment expected tomorrow: ${amountStr}.`,
          dedupKey: `project-due-soon-${String(job._id)}-${formatYmd(tomorrow)}`,
          dedupWindowHours: 36,
          meta: { jobId: String(job._id) },
        }
      );
    }

    if (sameUtcDay(due, today)) {
      await notifyMirrorEmail(
        { _id: u._id, email: u.email },
        prefs,
        {
          type: "project.payment_due",
          severity: "warning",
          title: `اليوم موعد تحصيل: ${label}`,
          body: `المبلغ المتوقع ${amountStr} — ${formatYmd(today)}. · Payment due today: ${amountStr}.`,
          dedupKey: `project-due-${String(job._id)}-${formatYmd(today)}`,
          dedupWindowHours: 36,
          meta: { jobId: String(job._id) },
        }
      );
    }

    if (due < today) {
      await notifyMirrorEmail(
        { _id: u._id, email: u.email },
        prefs,
        {
          type: "project.payment_overdue",
          severity: "warning",
          title: `متأخر: ${label}`,
          body: `كان المفروض التحصيل ${formatYmd(due)} — ${amountStr} لسه معلّق. · Overdue since ${formatYmd(due)}: ${amountStr} still pending.`,
          dedupKey: `project-overdue-${String(job._id)}-${formatYmd(today)}`,
          dedupWindowHours: 24,
          meta: { jobId: String(job._id) },
        }
      );
    }
  }

  for (const inst of installments) {
    const due = new Date(inst.date);
    const label = inst.name?.trim() || "قسط مشروع";
    const amountStr = Number(inst.amount).toFixed(2);

    if (sameUtcDay(due, tomorrow)) {
      await notifyMirrorEmail(
        { _id: u._id, email: u.email },
        prefs,
        {
          type: "project.installment_due_soon",
          severity: "info",
          title: `غدًا قسط: ${label}`,
          body: `${amountStr} — ${formatYmd(tomorrow)}${inst.note ? ` · ${inst.note}` : ""}. · Installment due tomorrow.`,
          dedupKey: `inst-due-soon-${String(inst._id)}-${formatYmd(tomorrow)}`,
          dedupWindowHours: 36,
          meta: {
            jobId: inst.freelanceProjectId ? String(inst.freelanceProjectId) : undefined,
          },
        }
      );
    }

    if (sameUtcDay(due, today)) {
      await notifyMirrorEmail(
        { _id: u._id, email: u.email },
        prefs,
        {
          type: "project.installment_due",
          severity: "warning",
          title: `اليوم قسط: ${label}`,
          body: `${amountStr} — ${formatYmd(today)}${inst.note ? ` · ${inst.note}` : ""}. · Installment due today.`,
          dedupKey: `inst-due-${String(inst._id)}-${formatYmd(today)}`,
          dedupWindowHours: 36,
          meta: {
            jobId: inst.freelanceProjectId ? String(inst.freelanceProjectId) : undefined,
          },
        }
      );
    }
  }
}

export async function runDailyJobs() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;

  const users = await User.find().lean();

  for (const u of users) {
    const uid = String(u._id);
    const email = u.email;
    const prefs = await loadPrefs(uid);

    await notifyRecurringDueDays(uid, u, prefs, now);
    await notifyProjectPaymentReminders(uid, u, prefs, now);

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

    await maybeNotifyDailyLoginReminder(u, prefs, now);

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
        cadence: prefs.digestCadence,
        totalSpent,
        remainingBalance: remaining,
        warnings: [],
        insights: [
          `Calendar month: ${y}-${String(m).padStart(2, "0")} · Cadence: ${prefs.digestCadence}`,
        ],
      });
      if (isEmailConfigured()) {
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

    await maybeNotifyLowNetBalance(uid);
  }
  return { ok: true };
}

export async function runMonthlyJobs() {
  const users = await User.find().lean();
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const prev = subMonths(new Date(y, m - 1, 1), 1);
  const yPrev = prev.getFullYear();
  const mPrev = prev.getMonth() + 1;
  const periodLabel = `${yPrev}-${String(mPrev).padStart(2, "0")}`;
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

    const closingReport = await buildMonthlyReport(yPrev, mPrev, uid);
    const net = Number(closingReport.summary.netBalance.toFixed(2));
    const top = closingReport.insights.biggestExpenseCategory;
    const topText = top ? `${top.name} (${top.amount.toFixed(2)})` : "N/A";
    await notifyOnce({
      userId: uid,
      type: "finance.monthly_closing",
      severity: net >= 0 ? "success" : "warning",
      title: `Monthly closing ready · ${periodLabel}`,
      body: `Income ${closingReport.summary.totalIncome.toFixed(2)} · Expenses ${closingReport.summary.totalExpenses.toFixed(2)} · Net ${net.toFixed(2)} · Top category: ${topText}`,
      dedupKey: `monthly-closing-${uid}-${periodLabel}`,
      dedupWindowHours: 24 * 45,
      meta: {
        period: periodLabel,
        totalIncome: closingReport.summary.totalIncome,
        totalExpenses: closingReport.summary.totalExpenses,
        netBalance: net,
      },
    });

    if (isEmailConfigured()) {
      const tpl = renderMonthlyClosingEmail({
        appName: appName(),
        periodLabel,
        totalIncome: closingReport.summary.totalIncome,
        totalExpenses: closingReport.summary.totalExpenses,
        netBalance: net,
        biggestExpenseCategory: top,
      });
      const dto = {
        ...closingReport,
        incomeLineItems: closingReport.incomeLineItems.map((x) => ({
          ...x,
          date: new Date(x.date).toISOString(),
        })),
        projectLineItems: closingReport.projectLineItems.map((x) => ({
          ...x,
          date: new Date(x.date).toISOString(),
        })),
        expenseLineItems: closingReport.expenseLineItems.map((x) => ({
          ...x,
          date: new Date(x.date).toISOString(),
        })),
      } as unknown as MonthlyReportDto;
      const pdfBuffer = monthlyReportPdfToBuffer(dto);
      await sendEmail({
        to: email,
        subject: tpl.subject,
        html: tpl.html,
        text: tpl.text,
        attachments: [
          {
            filename: `monthly-closing-${periodLabel}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });
    }
  }
  return { ok: true };
}

export async function getUnreadNotificationsCount(userId: string) {
  return Notification.countDocuments({ userId, readAt: null });
}
