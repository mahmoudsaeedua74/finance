import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Notification } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function POST() {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  await connectDB();
  const r = await Notification.updateMany(
    { userId: user.id, readAt: null },
    { $set: { readAt: new Date() } }
  );
  return NextResponse.json({ data: { modified: r.modifiedCount } });
}
