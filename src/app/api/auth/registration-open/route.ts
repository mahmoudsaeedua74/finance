import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/lib/models";

export const dynamic = "force-dynamic";

/** Public: first account or ALLOW_REGISTER allows sign-up. */
export async function GET() {
  try {
    await connectDB();
    const count = await User.countDocuments();
    const open = count === 0 || process.env.ALLOW_REGISTER === "true";
    return NextResponse.json({ open, hasUsers: count > 0 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Database error";
    // Do not send `open` / `hasUsers` here: connection failed, so we don't know. Misleading
    // `open: false, hasUsers: true` looked like "registration closed" in DevTools.
    return NextResponse.json({ dbError: true, error: msg }, { status: 503 });
  }
}
