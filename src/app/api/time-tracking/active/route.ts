import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { getActiveTimer } from "@/lib/services/time-tracking-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    await connectDB();
    return NextResponse.json({ data: await getActiveTimer(user.id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not load active timer" }, { status: 400 });
  }
}
