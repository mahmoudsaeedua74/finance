import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { createFeature, listFeatures } from "@/lib/services/feature-service";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  try {
    await connectDB();
    return NextResponse.json({ data: await listFeatures(user.id, params.id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  try {
    await connectDB();
    const body = await req.json();
    return NextResponse.json({ data: await createFeature(user.id, params.id, body ?? {}) }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not create Feature" }, { status: 400 });
  }
}
