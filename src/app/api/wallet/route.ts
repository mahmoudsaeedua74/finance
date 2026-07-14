import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import {
  computeWalletSummary,
  setWalletCurrentBalances,
  upsertWalletOpening,
} from "@/lib/services/wallet-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    await connectDB();
    const data = await computeWalletSummary(user.id);
    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    const body = await req.json();
    await connectDB();
    if (body?.cashBalance != null || body?.cardBalance != null) {
      const current = await computeWalletSummary(user.id);
      const data = await setWalletCurrentBalances(user.id, {
        cashBalance:
          body?.cashBalance != null ? Number(body.cashBalance) : current.cashBalance,
        cardBalance:
          body?.cardBalance != null ? Number(body.cardBalance) : current.cardBalance,
      });
      return NextResponse.json({ data });
    }
    await upsertWalletOpening(user.id, {
      openingCash: body?.openingCash,
      openingCard: body?.openingCard,
    });
    const data = await computeWalletSummary(user.id);
    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
