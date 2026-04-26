"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { jsonFetch } from "@/lib/fetcher";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Settings } from "lucide-react";

type Pref = {
  nearBudgetThresholdPct: number;
  inactivityDays: number;
  digestCadence: "daily" | "weekly";
  criticalEmailEnabled: boolean;
  digestEmailEnabled: boolean;
  mirrorInAppToEmail: boolean;
  noLoginReminderEmail: boolean;
  netDecreaseEmail: boolean;
  inactivityNudgeEmail: boolean;
};

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tC = useTranslations("common");
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => jsonFetch<{ data: Pref }>("/api/notification-preferences"),
  });
  const [form, setForm] = useState<Pref | null>(null);

  useEffect(() => {
    if (data?.data) setForm(data.data);
  }, [data]);

  const save = useMutation({
    mutationFn: (body: Partial<Pref>) =>
      jsonFetch("/api/notification-preferences", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success(tC("save"));
      void qc.invalidateQueries({ queryKey: ["notification-preferences"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !form) {
    return (
      <div className="h-64 max-w-2xl animate-pulse rounded-xl border border-border/60 bg-muted/20" />
    );
  }

  const boolRow = (key: keyof Pref, label: string, hint?: string) => (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <input
        type="checkbox"
        className="h-4 w-4 accent-primary"
        checked={Boolean(form[key])}
        onChange={(e) => setForm((f) => (f ? { ...f, [key]: e.target.checked } : f))}
      />
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        icon={<Settings className="size-5" />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("emailSection")}</CardTitle>
          <CardDescription>{t("emailSectionDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {boolRow("mirrorInAppToEmail", t("mirrorInApp"), t("mirrorInAppDesc"))}
          {boolRow("digestEmailEnabled", t("digestEmail"), t("digestEmailDesc"))}
          {boolRow("criticalEmailEnabled", t("criticalEmail"), t("criticalEmailDesc"))}
          {boolRow("noLoginReminderEmail", t("noLogin"), t("noLoginDesc"))}
          {boolRow("netDecreaseEmail", t("netDrop"), t("netDropDesc"))}
          {boolRow("inactivityNudgeEmail", t("inactivityNudge"), t("inactivityNudgeDesc"))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("rulesSection")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="thr">{t("budgetThreshold")}</Label>
            <Input
              id="thr"
              type="number"
              min={1}
              max={100}
              className="h-11"
              value={form.nearBudgetThresholdPct}
              onChange={(e) =>
                setForm((f) =>
                  f ? { ...f, nearBudgetThresholdPct: Number(e.target.value) || 80 } : f
                )
              }
            />
          </div>
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="inact">{t("inactivityDays")}</Label>
            <Input
              id="inact"
              type="number"
              min={1}
              max={90}
              className="h-11"
              value={form.inactivityDays}
              onChange={(e) =>
                setForm((f) => (f ? { ...f, inactivityDays: Number(e.target.value) || 5 } : f))
              }
            />
          </div>
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="cad">{t("digestCadence")}</Label>
            <select
              id="cad"
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={form.digestCadence}
              onChange={(e) =>
                setForm((f) =>
                  f
                    ? {
                        ...f,
                        digestCadence: e.target.value === "daily" ? "daily" : "weekly",
                      }
                    : f
                )
              }
            >
              <option value="daily">{t("cadDaily")}</option>
              <option value="weekly">{t("cadWeekly")}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Button
        type="button"
        className="min-h-11 w-full min-[400px]:w-auto"
        onClick={() => save.mutate(form)}
        disabled={save.isPending}
      >
        {tC("save")}
      </Button>
    </div>
  );
}
