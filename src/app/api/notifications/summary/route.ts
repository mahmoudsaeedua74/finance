import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Notification } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET() {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  await connectDB();
  const userId = user.id;
  const [unreadCount, latest] = await Promise.all([
    Notification.countDocuments({ userId, readAt: null }),
    Notification.findOne({ userId, readAt: null })
      .sort({ createdAt: -1, _id: -1 })
      .select({ title: 1, body: 1, createdAt: 1 })
      .lean(),
  ]);
  return NextResponse.json({
    data: {
      unreadCount,
      latest: latest
        ? {
            title: String(latest.title || ""),
            body: String(latest.body || "").slice(0, 200),
            createdAt: latest.createdAt,
          }
        : null,
    },
  });
}
