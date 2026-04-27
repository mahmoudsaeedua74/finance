import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models";
import { requireAuthUser } from "@/lib/api-auth";

export const dynamic = "force-dynamic";

const MIN_MS_BETWEEN_UPDATES = 30 * 60 * 1000;

/** Marks account activity when the dashboard loads (throttled) — drives login-reminder emails (24h window). */
export async function POST() {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  await connectDB();
  const doc = await User.findById(user.id).select({ lastLoginAt: 1 }).lean();
  const last = doc?.lastLoginAt ? new Date(doc.lastLoginAt).getTime() : 0;
  if (last && Date.now() - last < MIN_MS_BETWEEN_UPDATES) {
    return NextResponse.json({ ok: true, skipped: true });
  }
  await User.updateOne({ _id: user.id }, { $set: { lastLoginAt: new Date() } });
  return NextResponse.json({ ok: true });
}
