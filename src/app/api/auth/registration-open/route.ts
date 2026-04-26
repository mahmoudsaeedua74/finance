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
    return NextResponse.json(
      { open: false, hasUsers: true, error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
