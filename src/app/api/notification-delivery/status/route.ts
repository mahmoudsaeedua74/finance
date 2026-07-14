import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { NotificationPreference, User } from "@/lib/models";
import { requireAuthUser } from "@/lib/api-auth";
import { getEmailFromAddress, getEmailProvider, isEmailConfigured } from "@/lib/services/email-service";
import { isJobsAuthConfigured } from "@/lib/jobs-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  await connectDB();

  const [u, prefs] = await Promise.all([
    User.findById(user.id).select({ email: 1, lastLoginAt: 1, createdAt: 1 }).lean(),
    NotificationPreference.findOne({ userId: user.id }).lean(),
  ]);

  const lastLoginAt = u?.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null;
  const hoursSinceActivity =
    u?.lastLoginAt != null
      ? Math.round((Date.now() - new Date(u.lastLoginAt).getTime()) / 3600_000)
      : null;

  const noLoginReminderEmail = prefs?.noLoginReminderEmail !== false;
  const digestEmailEnabled = prefs?.digestEmailEnabled !== false;
  const digestCadence = prefs?.digestCadence || "weekly";

  return NextResponse.json({
    data: {
      email: u?.email ?? user.email,
      emailConfigured: isEmailConfigured(),
      emailProvider: getEmailProvider(),
      emailFrom: getEmailFromAddress(),
      jobsAuthConfigured: isJobsAuthConfigured(),
      lastLoginAt,
      hoursSinceActivity,
      noLoginReminderEmail,
      digestEmailEnabled,
      digestCadence,
      reminderTimezone: process.env.LOGIN_REMINDER_TIMEZONE?.trim() || "Africa/Cairo",
      reminderWindow: {
        start: Number(process.env.LOGIN_REMINDER_START_HOUR ?? 10),
        end: Number(process.env.LOGIN_REMINDER_END_HOUR ?? 23),
      },
    },
  });
}
