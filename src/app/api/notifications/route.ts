import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Notification } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  const { searchParams } = new URL(req.url);
  const unreadOnly = searchParams.get("unread") === "1";
  await connectDB();
  const query = unreadOnly ? { userId: user.id, readAt: null } : { userId: user.id };
  const rows = await Notification.find(query).sort({ createdAt: -1 }).limit(50).lean();
  return NextResponse.json({ data: rows.map((r) => ({ ...r, _id: String(r._id) })) });
}
