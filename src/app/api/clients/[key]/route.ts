import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { getClientDetail } from "@/lib/services/client-service";
import { upsertClientProfile } from "@/lib/services/client-profile-service";
import { clientFilterFromUrlKey } from "@/lib/project-job-filters";

export const dynamic = "force-dynamic";

type Ctx = { params: { key: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    await connectDB();
    const clientName = clientFilterFromUrlKey(params.key);
    const detail = await getClientDetail(user.id, clientName);
    if (!detail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ data: detail });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    const body = await req.json();
    await connectDB();
    const clientName = clientFilterFromUrlKey(params.key);
    const profile = await upsertClientProfile(user.id, clientName, {
      phone: body?.phone,
      whatsapp: body?.whatsapp,
      notes: body?.notes,
    });
    return NextResponse.json({ data: profile });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 400 }
    );
  }
}
