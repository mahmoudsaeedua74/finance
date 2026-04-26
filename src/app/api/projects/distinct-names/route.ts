import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Project } from "@/lib/models";

export const dynamic = "force-dynamic";

/** Combobox / datalist: unique project names for tagging spend (avoids loading paginated `GET /api/projects` pages). */
export async function GET() {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    await connectDB();
    const raw = await Project.distinct("name", { userId: user.id });
    const names = (raw as string[])
      .map((n) => n.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return NextResponse.json({ data: { names } });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
