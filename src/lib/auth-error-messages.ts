/**
 * Map NextAuth /api/auth/* error values (query param or signIn() result) to a stable kind.
 * Never trust raw strings for content — only for optional detail after classification.
 */
export type AuthErrorKind = "bad_credentials" | "database" | "config" | "raw";

const DB_HINTS = /mongodb|mongoose|ECONN|ENOTFOUND|ETIMEDOUT|ETIMEDOUT|querySrv|SSL|tls|replica|Atlas|whitelisted|IP address/i;
const THROWN_AUTH_DB = "AUTH_DB_UNAVAILABLE";

export function parseNextAuthError(error: string | null | undefined): {
  kind: AuthErrorKind;
  /** Safe user-facing extra line (e.g. short technical hint), never a secret */
  detail?: string;
} {
  if (error == null || error === "") {
    return { kind: "bad_credentials" };
  }
  const decoded = tryDecode(error);
  if (decoded === "CredentialsSignin" || decoded === "Authentication" || decoded === "OAuthAccountNotLinked") {
    return { kind: "bad_credentials" };
  }
  if (decoded === THROWN_AUTH_DB || decoded.startsWith("AUTH_")) {
    return { kind: "database" };
  }
  if (decoded === "Configuration" || decoded === "Default") {
    return { kind: "config" };
  }
  if (DB_HINTS.test(decoded)) {
    return { kind: "database", detail: truncateDetail(decoded) };
  }
  if (decoded.length > 40) {
    return { kind: "raw", detail: truncateDetail(decoded) };
  }
  return { kind: "raw", detail: decoded };
}

function tryDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function truncateDetail(s: string, max = 400): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/** Extract `error` from a NextAuth error URL, if present. */
export function getErrorParamFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url, "https://placeholder.local");
    return u.searchParams.get("error");
  } catch {
    return null;
  }
}
