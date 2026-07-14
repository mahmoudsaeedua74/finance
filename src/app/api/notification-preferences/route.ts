import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { NotificationPreference } from "@/lib/models";
import { requireAuthUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  await connectDB();
  const p = await NotificationPreference.findOne({ userId: user.id }).lean();
  if (!p) {
    return NextResponse.json({
      data: {
        nearBudgetThresholdPct: 80,
        inactivityDays: 5,
        digestCadence: "daily" as const,
        criticalEmailEnabled: true,
        digestEmailEnabled: true,
        mirrorInAppToEmail: true,
        noLoginReminderEmail: true,
        netDecreaseEmail: true,
        inactivityNudgeEmail: true,
        activityNotificationsEnabled: true,
        recurringDueRemindersEnabled: true,
        projectPaymentRemindersEnabled: true,
        lowBalanceThreshold: null,
      },
    });
  }
  return NextResponse.json({
    data: {
      nearBudgetThresholdPct: p.nearBudgetThresholdPct,
      inactivityDays: p.inactivityDays,
      digestCadence: p.digestCadence,
      criticalEmailEnabled: p.criticalEmailEnabled,
      digestEmailEnabled: p.digestEmailEnabled,
      mirrorInAppToEmail: p.mirrorInAppToEmail,
      noLoginReminderEmail: p.noLoginReminderEmail,
      netDecreaseEmail: p.netDecreaseEmail,
      inactivityNudgeEmail: p.inactivityNudgeEmail,
      activityNotificationsEnabled: p.activityNotificationsEnabled !== false,
      recurringDueRemindersEnabled: p.recurringDueRemindersEnabled !== false,
      projectPaymentRemindersEnabled: p.projectPaymentRemindersEnabled !== false,
      lowBalanceThreshold:
        p.lowBalanceThreshold != null && p.lowBalanceThreshold > 0
          ? p.lowBalanceThreshold
          : null,
    },
  });
}

type Body = {
  nearBudgetThresholdPct?: number;
  inactivityDays?: number;
  digestCadence?: "daily" | "weekly";
  criticalEmailEnabled?: boolean;
  digestEmailEnabled?: boolean;
  mirrorInAppToEmail?: boolean;
  noLoginReminderEmail?: boolean;
  netDecreaseEmail?: boolean;
  inactivityNudgeEmail?: boolean;
  activityNotificationsEnabled?: boolean;
  recurringDueRemindersEnabled?: boolean;
  projectPaymentRemindersEnabled?: boolean;
  lowBalanceThreshold?: number | null;
};

export async function PUT(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  const body = (await req.json().catch(() => ({}))) as Body;
  await connectDB();
  const update: Record<string, unknown> = {};
  if (body.nearBudgetThresholdPct != null) {
    const n = Math.round(Number(body.nearBudgetThresholdPct));
    update.nearBudgetThresholdPct = Math.min(100, Math.max(1, n));
  }
  if (body.inactivityDays != null) {
    const d = Math.round(Number(body.inactivityDays));
    update.inactivityDays = Math.min(90, Math.max(1, d));
  }
  if (body.digestCadence === "daily" || body.digestCadence === "weekly") {
    update.digestCadence = body.digestCadence;
  }
  for (const k of [
    "criticalEmailEnabled",
    "digestEmailEnabled",
    "mirrorInAppToEmail",
    "noLoginReminderEmail",
    "netDecreaseEmail",
    "inactivityNudgeEmail",
    "activityNotificationsEnabled",
    "recurringDueRemindersEnabled",
    "projectPaymentRemindersEnabled",
  ] as const) {
    if (typeof body[k] === "boolean") update[k] = body[k];
  }
  if (body.lowBalanceThreshold === null) {
    update.lowBalanceThreshold = null;
  } else if (body.lowBalanceThreshold != null) {
    const n = Number(body.lowBalanceThreshold);
    if (Number.isFinite(n) && n > 0) {
      update.lowBalanceThreshold = Math.min(1e12, n);
    } else {
      update.lowBalanceThreshold = null;
    }
  }
  const doc = await NotificationPreference.findOneAndUpdate(
    { userId: user.id },
    { $set: update, $setOnInsert: { userId: user.id } },
    { upsert: true, new: true }
  ).lean();
  if (!doc) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, data: doc });
}
