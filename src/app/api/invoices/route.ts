import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import {
  createInvoice,
  listNormalBillingGroups,
  listOpenInvoices,
  listUnbilledJobsByIds,
  listUnbilledNormalForClient,
} from "@/lib/services/invoice-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");
    const client = searchParams.get("client")?.trim() ?? "";
    const idsRaw = searchParams.get("ids")?.trim() ?? "";

    if (mode === "groups") {
      const data = await listNormalBillingGroups(user.id);
      return NextResponse.json({ data });
    }
    if (mode === "jobs" && idsRaw) {
      const ids = idsRaw.split(",").map((s) => s.trim()).filter(Boolean);
      const data = await listUnbilledJobsByIds(user.id, ids);
      return NextResponse.json({ data });
    }
    if (mode === "unbilled") {
      const data = await listUnbilledNormalForClient(user.id, client);
      return NextResponse.json({ data });
    }
    const data = await listOpenInvoices(user.id, client || undefined);
    return NextResponse.json({ data });
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
    await connectDB();
    const data = await createInvoice(user.id, {
      clientName: String(body?.clientName ?? ""),
      jobIds: Array.isArray(body?.jobIds) ? body.jobIds.map(String) : [],
      notes: typeof body?.notes === "string" ? body.notes : "",
      status: body?.status === "issued" ? "issued" : "draft",
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 400 }
    );
  }
}
