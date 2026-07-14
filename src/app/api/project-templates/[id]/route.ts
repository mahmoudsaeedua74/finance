import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { deleteProjectTemplate } from "@/lib/services/project-template-service";

export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function DELETE(_req: Request, { params }: Ctx) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    await connectDB();
    const ok = await deleteProjectTemplate(user.id, params.id);
    if (!ok) return NextResponse.json({ error: "Not found or builtin" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
