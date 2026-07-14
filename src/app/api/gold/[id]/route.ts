import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { GoldHolding, type GoldKarat } from "@/lib/models";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

function parseHoldingBody(body: {
  weightPerBar?: number;
  numberOfBars?: number;
  karat?: number;
}) {
  const weightPerBar = Number(body.weightPerBar);
  const numberOfBars = Number(body.numberOfBars);
  const karat = Number(body.karat);
  if (!Number.isFinite(weightPerBar) || weightPerBar <= 0) {
    return { error: "weightPerBar must be > 0" as const };
  }
  if (!Number.isFinite(numberOfBars) || numberOfBars <= 0) {
    return { error: "numberOfBars must be > 0" as const };
  }
  if (![18, 21, 24].includes(karat)) {
    return { error: "karat must be 18, 21, or 24" as const };
  }
  return {
    data: {
      weightPerBar,
      numberOfBars,
      karat: karat as GoldKarat,
    },
  };
}

function toDto(row: {
  _id: unknown;
  userId: unknown;
  weightPerBar: number;
  numberOfBars: number;
  karat: GoldKarat;
  createdAt: Date;
}) {
  return {
    id: String(row._id),
    userId: String(row.userId),
    weightPerBar: row.weightPerBar,
    numberOfBars: row.numberOfBars,
    karat: row.karat,
    createdAt: row.createdAt,
  };
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const body = (await req.json().catch(() => ({}))) as {
      weightPerBar?: number;
      numberOfBars?: number;
      karat?: number;
    };
    const parsed = parseHoldingBody(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    await connectDB();
    const doc = await GoldHolding.findOneAndUpdate(
      { _id: params.id, userId: user.id },
      parsed.data,
      { new: true }
    ).lean();
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: toDto(doc) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const doc = await GoldHolding.findOneAndDelete({ _id: params.id, userId: user.id });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
