import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
};

/** Use at the start of each API route handler. Returns 401 response or null. */
export async function requireSession(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  const id = session?.user?.id;
  const email = session?.user?.email;
  if (!id || !email) return null;
  return { id, email, name: session.user.name };
}

/** Use in route handlers that need both auth check and user identity. */
export async function requireAuthUser(): Promise<{
  unauthorized: NextResponse;
  user: null;
} | {
  unauthorized: null;
  user: AuthUser;
}> {
  const user = await getAuthUser();
  if (!user) {
    return {
      unauthorized: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
    };
  }
  return { unauthorized: null, user };
}
