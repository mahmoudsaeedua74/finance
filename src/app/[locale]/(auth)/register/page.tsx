"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
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
  const [dbHint, setDbHint] = useState<string | null>(null);

  return (
    <Card className="w-full max-w-md border-border/80 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">{t("register")}</CardTitle>
        <CardDescription>{t("registerDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {dbHint && (
          <div
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm"
            role="status"
          >
            <p className="font-medium text-destructive">{t("registerDbError")}</p>
            <p className="mt-1 font-mono text-xs break-words text-muted-foreground">{dbHint}</p>
          </div>
        )}
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setLoading(true);
            setDbHint(null);
            const h = await checkDbOnClient();
            if (!h.ok) {
              setDbHint(h.message);
              toast.error(t("registerDbError"), { description: h.message, duration: 12_000 });
              setLoading(false);
              return;
            }
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
              router.push("/login?registered=1");
              router.refresh();
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
