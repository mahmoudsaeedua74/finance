import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/lib/models";
import {
  listCategoriesForUser,
  normalizeCategoryName,
} from "@/lib/services/categories-service";

export const dynamic = "force-dynamic";

function parseType(v: string | null): "income" | "expense" | null {
  if (v === "income" || v === "expense") return v;
  return null;
}

export async function GET(req: Request) {
  const { unauthorized, user } = await requireAuthUser();
  if (unauthorized) return unauthorized;
  try {
    const { searchParams } = new URL(req.url);
    const type = parseType(searchParams.get("type"));
    if (!type) {
      return NextResponse.json({ error: "type must be income or expense" }, { status: 400 });
    }
    await connectDB();
    const rows = await listCategoriesForUser(user.id, type);
    return NextResponse.json({ data: rows });
  } catch (e) {
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
    const body = (await req.json().catch(() => ({}))) as {
      type?: "income" | "expense";
      name?: string;
    };
    const type = body.type === "income" || body.type === "expense" ? body.type : null;
    const name = normalizeCategoryName(String(body.name ?? ""));
    const normalizedName = name.toLowerCase();
    if (!type) {
      return NextResponse.json({ error: "type must be income or expense" }, { status: 400 });
    }
    if (!name || name.length < 2 || name.length > 50) {
      return NextResponse.json({ error: "name must be 2..50 chars" }, { status: 400 });
    }
    await connectDB();
    const exists = await Category.findOne({
      userId: user.id,
      type,
      normalizedName,
    }).lean();
    if (exists) {
      return NextResponse.json({ error: "Category already exists" }, { status: 409 });
    }
    const doc = await Category.create({
      userId: user.id,
      type,
      name,
      normalizedName,
    });
    return NextResponse.json(
      {
        data: {
          id: String(doc._id),
          name: doc.name,
          type: doc.type,
          isDefault: false,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
