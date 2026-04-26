import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { buildLedgerReport } from "@/lib/build-ledger-report";
import { connectDB } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

export async function GET() {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    await connectDB();
    const data = await buildLedgerReport(user.id);
    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
