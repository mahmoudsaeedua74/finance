import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import {
  createClient,
  listClientOptions,
  listClientSummaries,
  listDistinctClientNames,
} from "@/lib/services/client-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    if (searchParams.get("options") === "1") {
      const options = await listClientOptions(user.id);
      return NextResponse.json({ data: options });
    }
    if (searchParams.get("namesOnly") === "1") {
      const names = await listDistinctClientNames(user.id);
      return NextResponse.json({ data: names });
    }
    const summaries = await listClientSummaries(user.id);
    return NextResponse.json({ data: summaries });
  } catch (e) {
    console.error(e);
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
    const body = await req.json();
    const clientName = typeof body?.clientName === "string" ? body.clientName.trim() : "";
    if (!clientName) {
      return NextResponse.json({ error: "clientName is required" }, { status: 400 });
    }
    await connectDB();
    const phone = typeof body?.phone === "string" ? body.phone.trim().slice(0, 50) : "";
    const data = await createClient(user.id, { clientName, phone: phone || undefined });
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 400 }
    );
  }
}
