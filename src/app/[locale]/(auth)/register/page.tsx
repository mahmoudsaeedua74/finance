"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
export default function RegisterPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Card className="w-full max-w-md border-border/80 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">{t("register")}</CardTitle>
        <CardDescription>{t("registerDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            try {
              const r = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, name }),
              });
              const body = await r.json().catch(() => ({}));
              if (!r.ok) {
                const msg = (body as { error?: string }).error;
                if (r.status >= 500 || /db|connection|database/i.test(String(msg || ""))) {
                  toast.error(t("registerDbError"), {
                    description: msg,
                    duration: 12_000,
                  });
                } else {
                  toast.error(msg || t("registerFail"));
                }
                setLoading(false);
                return;
              }
              const loginPath =
                locale === routing.defaultLocale
                  ? "/login?registered=1"
                  : `/${locale}/login?registered=1`;
              window.location.replace(loginPath);
            } catch {
              toast.error(t("registerFail"));
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
          <Button type="submit" className="h-11 w-full" disabled={loading}>
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
