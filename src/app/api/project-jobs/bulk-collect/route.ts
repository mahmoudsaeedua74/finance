import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { parsePaymentMethodBody } from "@/lib/payment-method";
import { bulkCollectProjectJobs } from "@/lib/services/project-bulk-service";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    const body = await req.json();
    const ids = Array.isArray(body?.ids) ? (body.ids as string[]) : [];
    const dateRaw = body?.date;
    const paymentMethod = parsePaymentMethodBody(body?.paymentMethod) ?? "cash";

    if (ids.length === 0) {
      return NextResponse.json({ error: "ids required" }, { status: 400 });
    }

    const date = dateRaw ? new Date(String(dateRaw)) : new Date();
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    await connectDB();
    const result = await bulkCollectProjectJobs(user.id, ids, { date, paymentMethod });
    return NextResponse.json({ data: result });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
