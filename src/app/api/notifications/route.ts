import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Notification } from "@/lib/models";
import { parseListPagination, toPaginatedBody } from "@/lib/api/list-pagination";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  const { searchParams } = new URL(req.url);
  const { limit, offset } = parseListPagination(searchParams);
  const unreadOnly = searchParams.get("unread") === "1";
  await connectDB();
  const take = limit + 1;
  const query = unreadOnly ? { userId: user.id, readAt: null } : { userId: user.id };
  const raw = await Notification.find(query)
    .sort({ createdAt: -1, _id: -1 })
    .skip(offset)
    .limit(take)
    .lean();
  const rows = raw.map((r) => ({ ...r, _id: String(r._id) }));
  return NextResponse.json({ ...toPaginatedBody(rows, offset, limit) });
}
