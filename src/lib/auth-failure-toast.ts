import { toast } from "sonner";
import { getErrorParamFromUrl, parseNextAuthError } from "@/lib/auth-error-messages";

type SignInResult = { error?: string | null; url?: string | null; ok?: boolean | null } | null | undefined;

/**
 * Map NextAuth signIn() failure or ?error= on /login to user-visible toasts.
 * Call on the client after signIn(redirect: false) or from useEffect for URL ?error=.
 */
export function toastNextAuthLoginFailure(
  t: (k: string) => string,
  signInResult: SignInResult,
  urlErrorParam: string | null
): void {
  const fromUrl = urlErrorParam?.trim() || getErrorParamFromUrl(signInResult?.url ?? null)?.trim() || null;
  const fromSignIn = signInResult?.error?.trim() || null;
  const raw = fromSignIn || fromUrl;
  if (!raw) {
    toast.error(t("badCreds"));
    return;
  }
  const parsed = parseNextAuthError(raw);
  if (parsed.kind === "bad_credentials") {
    toast.error(t("badCreds"));
    return;
  }
  if (parsed.kind === "database") {
    toast.error(t("registerDbError"), {
      description: parsed.detail || t("authErrorDbDescription"),
      duration: 14_000,
    });
    return;
  }
  if (parsed.kind === "config") {
    toast.error(t("authErrorConfig"), { duration: 9_000 });
    return;
  }
  toast.error(t("authErrorSignIn"), {
    description: parsed.detail,
    duration: 12_000,
  });
}
