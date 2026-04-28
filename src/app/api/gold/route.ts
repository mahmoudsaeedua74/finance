import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { GoldHolding } from "@/lib/models";
import type { GoldKarat } from "@/lib/models";

export const dynamic = "force-dynamic";

export async function GET() {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    await connectDB();
    const rows = await GoldHolding.find({ userId: user.id })
      .sort({ createdAt: -1, _id: -1 })
      .lean();
    return NextResponse.json({
      data: rows.map((r) => ({
        id: String(r._id),
        userId: String(r.userId),
        weightPerBar: r.weightPerBar,
        numberOfBars: r.numberOfBars,
        karat: r.karat,
        createdAt: r.createdAt,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      weightPerBar?: number;
      numberOfBars?: number;
      karat?: 18 | 21 | 24;
    };
    const weightPerBar = Number(body.weightPerBar);
    const numberOfBars = Number(body.numberOfBars);
    const karat = Number(body.karat);
    if (!Number.isFinite(weightPerBar) || weightPerBar <= 0) {
      return NextResponse.json({ error: "weightPerBar must be > 0" }, { status: 400 });
    }
    if (!Number.isFinite(numberOfBars) || numberOfBars <= 0) {
      return NextResponse.json({ error: "numberOfBars must be > 0" }, { status: 400 });
    }
    if (![18, 21, 24].includes(karat)) {
      return NextResponse.json({ error: "karat must be 18, 21, or 24" }, { status: 400 });
    }
    const karatTyped = karat as GoldKarat;
    await connectDB();
    const doc = await GoldHolding.create({
      userId: user.id,
      weightPerBar,
      numberOfBars,
      karat: karatTyped,
    });
    const row = doc.toObject() as {
      _id: unknown;
      userId: unknown;
      weightPerBar: number;
      numberOfBars: number;
      karat: GoldKarat;
      createdAt: Date;
    };
    return NextResponse.json(
      {
        data: {
          id: String(row._id),
          userId: String(row.userId),
          weightPerBar: row.weightPerBar,
          numberOfBars: row.numberOfBars,
          karat: row.karat,
          createdAt: row.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
