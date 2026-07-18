import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { getSarToEgpRateCached } from "@/lib/services/fx-rate-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized } = await requireAuthUser();
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(req.url);
    const from = (searchParams.get("from") ?? "SAR").toUpperCase();
    const to = (searchParams.get("to") ?? "EGP").toUpperCase();

    if (from === "EGP" && to === "EGP") {
      return NextResponse.json({
        data: { from: "EGP", to: "EGP", rate: 1, updatedAt: new Date().toISOString(), cached: true },
      });
    }

    if (from !== "SAR" || to !== "EGP") {
      return NextResponse.json(
        { error: "Only SAR→EGP (and EGP→EGP) are supported" },
        { status: 400 }
      );
    }

    const data = await getSarToEgpRateCached();
    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
