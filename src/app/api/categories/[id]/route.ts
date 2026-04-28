import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/lib/models";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    if (!mongoose.isValidObjectId(params.id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    await connectDB();
    const doc = await Category.findOneAndDelete({ _id: params.id, userId: user.id });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
