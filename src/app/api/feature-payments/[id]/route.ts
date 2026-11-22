import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { collectFeaturePayment, deleteFeaturePayment, updateFeaturePayment } from "@/lib/services/feature-payment-service";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

export async function PUT(req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
  try {
    await connectDB();
    return NextResponse.json({ data: await updateFeaturePayment(user.id, params.id, await req.json()) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not update payment" }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
  try {
    await connectDB();
    const body = await req.json();
    if (body?.action !== "collect") return NextResponse.json({ error: "Unknown payment action" }, { status: 400 });
    return NextResponse.json({ data: await collectFeaturePayment(user.id, params.id, body) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not collect payment" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Invalid payment id" }, { status: 400 });
  try {
    await connectDB();
    return NextResponse.json(await deleteFeaturePayment(user.id, params.id));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not delete payment" }, { status: 400 });
  }
}
