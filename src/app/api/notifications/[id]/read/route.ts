import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Notification } from "@/lib/models";

type Ctx = { params: { id: string } };

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  if (!mongoose.isValidObjectId(params.id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }
  await connectDB();
  const doc = await Notification.findOneAndUpdate(
    { _id: params.id, userId: user.id },
    { $set: { readAt: new Date() } },
    { new: true }
  );
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: { ...doc.toObject(), _id: String(doc._id) } });
}
