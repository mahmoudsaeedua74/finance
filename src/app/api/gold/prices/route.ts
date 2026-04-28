import { NextResponse } from "next/server";
import { getGoldPricesCached } from "@/lib/services/gold-price-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getGoldPricesCached();
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
