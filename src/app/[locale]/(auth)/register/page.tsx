"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { checkDbOnClient } from "@/lib/client-db-health";

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [closed, setClosed] = useState(false);
  const [policyError, setPolicyError] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(true);
  const [dbHint, setDbHint] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    const to = setTimeout(() => ac.abort(), 20_000);
    fetch("/api/auth/registration-open", { signal: ac.signal })
      .then(async (r) => {
        const d = (await r.json().catch(() => ({}))) as { open?: boolean; dbError?: boolean };
        if (!r.ok) {
          setPolicyError(true);
          const h = await checkDbOnClient();
          if (!h.ok) setDbHint(h.message);
          return;
        }
        setClosed(!d.open);
        setPolicyError(false);
        setDbHint(null);
      })
      .catch(() => {
        setPolicyError(true);
        void checkDbOnClient().then((h) => {
          if (!h.ok) setDbHint(h.message);
        });
      })
      .finally(() => {
        setPolicyLoading(false);
        clearTimeout(to);
      });
    return () => {
      ac.abort();
      clearTimeout(to);
    };
  }, []);

  if (closed) {
    return (
      <Card className="w-full max-w-md border-border/80 shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl">{t("registerClosed")}</CardTitle>
          <CardDescription>{t("registerClosedDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className={cn(buttonVariants(), "h-11 w-full")}>
            {t("backToSignIn")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md border-border/80 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">{t("register")}</CardTitle>
        <CardDescription>{t("registerDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {policyLoading && (
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {t("registerPolicyWait")}
          </p>
        )}
        {policyError && !policyLoading && (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-foreground"
            role="status"
          >
            <p className="font-medium text-destructive">{t("registerDbError")}</p>
            <p className="mt-1 text-muted-foreground">{t("registerBannerDb")}</p>
            {dbHint && <p className="mt-2 font-mono text-xs text-muted-foreground break-words">{dbHint}</p>}
            <a
              href="/api/health/db"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              /api/health/db
            </a>
            <p className="mt-2 text-xs text-muted-foreground">{t("registerDbErrorDesc")}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t("registerDbErrorNote")}</p>
          </div>
        )}
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            const h = await checkDbOnClient();
            if (!h.ok) {
              setDbHint(h.message);
              setPolicyError(true);
              toast.error(t("registerDbError"), { description: h.message, duration: 12_000 });
              setLoading(false);
              return;
            }
            setPolicyError(false);
            setDbHint(null);
            try {
              const r = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, name }),
              });
              const body = await r.json().catch(() => ({}));
              if (!r.ok) {
                toast.error((body as { error?: string }).error || t("registerFail"));
                setLoading(false);
                return;
              }
              const sign = await signIn("credentials", {
                email: email.trim().toLowerCase(),
                password,
                redirect: false,
              });
              if (sign?.error) {
                toast.error(t("autoLoginFail"));
                router.push("/login");
                return;
              }
              router.push("/");
              router.refresh();
              toast.success(t("signedIn"));
            } catch {
              toast.error(t("registerFail"));
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="reg-name">{t("nameOpt")}</Label>
            <Input
              id="reg-name"
              className="h-11"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-email">{t("email")}</Label>
            <Input
              id="reg-email"
              type="email"
              className="h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg-pass">{t("password")}</Label>
            <Input
              id="reg-pass"
              type="password"
              className="h-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">{t("passwordRule")}</p>
          </div>
          <Button type="submit" className="h-11 w-full" disabled={loading || policyLoading}>
            {loading ? "…" : t("createAccount")}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
