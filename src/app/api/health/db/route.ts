import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

function sanitizeMongoUri(uri: string | undefined) {
  if (!uri) return null;
  // hide credentials if present: mongodb+srv://user:pass@host -> mongodb+srv://***:***@host
  return uri.replace(/\/\/([^:/?#]+):([^@]+)@/, "//***:***@");
}

export async function GET() {
  const uri = process.env.MONGODB_URI;
  try {
    await connectDB();
    return NextResponse.json({
      ok: true,
      message: "Database connection successful.",
      details: {
        hasMongoUri: Boolean(uri),
        mongoUriPreview: sanitizeMongoUri(uri),
        activeDatabase: mongoose.connection.db?.databaseName ?? null,
        nodeEnv: process.env.NODE_ENV ?? "unknown",
      },
    });
  } catch (error) {
    const err = error as Error & { code?: string; name?: string };
    return NextResponse.json(
      {
        ok: false,
        message: "Database connection failed.",
        details: {
          hasMongoUri: Boolean(uri),
          mongoUriPreview: sanitizeMongoUri(uri),
          nodeEnv: process.env.NODE_ENV ?? "unknown",
          errorName: err?.name ?? "UnknownError",
          errorCode: err?.code ?? null,
          errorMessage: err?.message ?? "No error message",
        },
      },
      { status: 500 }
    );
  }
}
