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

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/auth/registration-open")
      .then((r) => r.json())
      .then((d: { open?: boolean }) => setOpen(Boolean(d.open)))
      .catch(() => setOpen(false));
  }, []);

  if (open === false) {
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

  if (open === null) {
    return (
      <div className="text-sm text-muted-foreground" aria-live="polite">
        …
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md border-border/80 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">{t("register")}</CardTitle>
        <CardDescription>{t("registerDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
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
          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? "…" : t("createAccount")}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            {t("signIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
