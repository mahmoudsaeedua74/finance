import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Kept for older clients. Registration is always open; the register API enforces unique email only. */
export async function GET() {
  return NextResponse.json({ open: true });
}
