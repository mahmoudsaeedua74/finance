import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { archiveFeature, assertFeatureForRoute, buildFeatureDto, updateFeature } from "@/lib/services/feature-service";

export const dynamic = "force-dynamic";
type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Invalid feature id" }, { status: 400 });
  try {
    await connectDB();
    const feature = await assertFeatureForRoute(user.id, params.id);
    return NextResponse.json({ data: await buildFeatureDto(feature as never, user.id) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Feature not found" }, { status: 404 });
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Invalid feature id" }, { status: 400 });
  try {
    await connectDB();
    return NextResponse.json({ data: await updateFeature(user.id, params.id, await req.json()) });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not update Feature" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) return NextResponse.json({ error: "Invalid feature id" }, { status: 400 });
  try {
    await connectDB();
    return NextResponse.json(await archiveFeature(user.id, params.id));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Could not archive Feature" }, { status: 400 });
  }
}
