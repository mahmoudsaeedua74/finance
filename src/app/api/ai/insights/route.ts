import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import {
  buildLocalFinanceInsights,
  buildLocalProjectsInsights,
} from "@/lib/ai/local-insights";

export const dynamic = "force-dynamic";

type Surface = "projects" | "transactions" | "reports";

export async function POST(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json().catch(() => ({}));
    const surface = (body?.surface ?? "projects") as Surface;
    const locale = body?.locale === "en" ? "en" : "ar";

    await connectDB();

    const text =
      surface === "projects"
        ? await buildLocalProjectsInsights(user.id, locale)
        : await buildLocalFinanceInsights(
            user.id,
            surface === "reports" ? "reports" : "transactions",
            locale
          );

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
