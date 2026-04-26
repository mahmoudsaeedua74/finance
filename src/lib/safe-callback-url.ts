import { routing } from "@/i18n/routing";

function defaultHomeForLocale(locale: string): string {
  return locale === routing.defaultLocale ? "/" : `/${locale}`;
}

/**
 * Returns a same-origin path for post-login redirect. Rejects open redirects.
 * @param raw from `callbackUrl` query or NextAuth `signIn` `url` field
 */
export function safePathAfterAuth(
  raw: string | null | undefined,
  locale: string
): string {
  const fallback = defaultHomeForLocale(locale);
  if (raw == null || raw === "") {
    return fallback;
  }
  const t = String(raw).trim();
  if (t.startsWith("/") && !t.startsWith("//")) {
    return t;
  }
  if (typeof window !== "undefined") {
    try {
      const u = new URL(t, window.location.origin);
      if (u.origin === window.location.origin) {
        const p = u.pathname + u.search;
        return p || fallback;
      }
    } catch {
      /* ignore */
    }
  }
  return fallback;
}
