import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { buildLocalFinanceInsights } from "@/lib/ai/local-insights";

export const dynamic = "force-dynamic";

type Surface = "transactions" | "reports";

export async function POST(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json().catch(() => ({}));
    const surfaceRaw = body?.surface as string | undefined;
    if (surfaceRaw === "projects") {
      return NextResponse.json(
        { error: "Projects insights are no longer available" },
        { status: 410 }
      );
    }
    const surface: Surface = surfaceRaw === "reports" ? "reports" : "transactions";
    const locale = body?.locale === "en" ? "en" : "ar";

    await connectDB();

    const text = await buildLocalFinanceInsights(user.id, surface, locale);

    return NextResponse.json({
      data: { text, surface, generatedAt: new Date().toISOString(), engine: "local" },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Insight error" },
      { status: 500 }
    );
  }
}
