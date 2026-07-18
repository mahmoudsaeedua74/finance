import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import {
  getInvoice,
  markInvoicePaid,
  updateInvoiceBasket,
} from "@/lib/services/invoice-service";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    await connectDB();
    const data = await getInvoice(user.id, params.id);
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data });
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

    if (body?.action === "mark_paid") {
      const data = await markInvoicePaid(user.id, params.id);
      return NextResponse.json({ data });
    }

    if (Array.isArray(body?.jobIds)) {
      const data = await updateInvoiceBasket(
        user.id,
        params.id,
        body.jobIds.map(String)
      );
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "jobIds or action required" }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 400 }
    );
  }
}
