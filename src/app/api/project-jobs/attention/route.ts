import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import {
  getProjectAttentionItems,
  type ProjectAttentionScope,
} from "@/lib/services/project-attention-service";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    await connectDB();
    const scopeRaw = new URL(req.url).searchParams.get("scope");
    const scope: ProjectAttentionScope =
      scopeRaw === "collections" || scopeRaw === "preview" ? scopeRaw : "all";
    const data = await getProjectAttentionItems(user.id, scope);
    return NextResponse.json({ data });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
