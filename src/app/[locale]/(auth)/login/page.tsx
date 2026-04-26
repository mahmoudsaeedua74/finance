"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { usePathname, useSearchParams } from "next/navigation";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { checkDbOnClient } from "@/lib/client-db-health";

function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const didWelcome = useRef(false);

  useEffect(() => {
    if (searchParams.get("registered") !== "1" || didWelcome.current) return;
    didWelcome.current = true;
    toast.success(t("accountCreatedSignIn"));
    router.replace(pathname);
  }, [searchParams, pathname, router, t]);

  const callback = searchParams.get("callbackUrl") || "/";
  return (
    <Card className="w-full max-w-md border-border/80 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">{t("signIn")}</CardTitle>
        <CardDescription>{t("signInDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            const health = await checkDbOnClient();
            if (!health.ok) {
              setLoading(false);
              toast.error(t("registerDbError"), {
                description: health.message,
                duration: 14_000,
              });
              return;
            }
            const res = await signIn("credentials", {
              email: email.trim().toLowerCase(),
              password,
              redirect: false,
            });
            setLoading(false);
            if (res?.error) {
              toast.error(t("badCreds"));
              return;
            }
            router.push(callback);
            router.refresh();
            toast.success(t("signedIn"));
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="auth-email">{t("email")}</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              className="h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-pass">{t("password")}</Label>
            <Input
              id="auth-pass"
              type="password"
              autoComplete="current-password"
              className="h-11"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? "…" : t("signIn")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("createAccount")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="h-32 w-full max-w-md animate-pulse rounded-2xl border border-border/60 bg-muted/30" />
      }
    >
      <LoginForm />
    </Suspense>
  );
}
