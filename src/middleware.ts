import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const secret =
  process.env.AUTH_SECRET ??
  process.env.NEXTAUTH_SECRET ??
  "dev-only-change-in-production";

function isAuthPage(pathname: string): boolean {
  const segs = pathname.split("/").filter(Boolean);
  const last = segs[segs.length - 1] ?? "";
  return last === "login" || last === "register";
}

function isArabicPath(pathname: string): boolean {
  return pathname === "/ar" || pathname.startsWith("/ar/");
}

function homePath(pathname: string): string {
  return isArabicPath(pathname) ? "/ar" : "/";
}

function loginPath(pathname: string): string {
  return isArabicPath(pathname) ? "/ar/login" : "/login";
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await getToken({ req: request, secret });

  if (isAuthPage(pathname)) {
    if (token) {
      return NextResponse.redirect(new URL(homePath(pathname), request.url));
    }
    return intlMiddleware(request);
  }

  if (!token) {
    return NextResponse.redirect(new URL(loginPath(pathname), request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/", "/(ar|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
