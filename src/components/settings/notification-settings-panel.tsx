"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { jsonFetch } from "@/lib/fetcher";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Bell,
  Mail,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Send,
  Clock,
  Zap,
} from "lucide-react";

export type NotificationPref = {
  nearBudgetThresholdPct?: number;
  inactivityDays: number;
  digestCadence: "daily" | "weekly";
  criticalEmailEnabled: boolean;
  digestEmailEnabled: boolean;
  mirrorInAppToEmail: boolean;
  noLoginReminderEmail: boolean;
  netDecreaseEmail: boolean;
  inactivityNudgeEmail: boolean;
  activityNotificationsEnabled: boolean;
  recurringDueRemindersEnabled: boolean;
  projectPaymentRemindersEnabled: boolean;
  lowBalanceThreshold: number | null;
};

type DeliveryStatus = {
  email: string;
  emailConfigured: boolean;
  emailProvider: "smtp" | "resend" | null;
  emailFrom: string | null;
  jobsAuthConfigured: boolean;
  lastLoginAt: string | null;
  hoursSinceActivity: number | null;
  noLoginReminderEmail: boolean;
  digestEmailEnabled: boolean;
  digestCadence: "daily" | "weekly";
  reminderTimezone: string;
  reminderWindow: { start: number; end: number };
};

function StatusPill({
  ok,
  label,
  detail,
}: {
  ok: boolean;
  label: string;
  detail?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3 py-2.5",
        ok
          ? "border-emerald-500/25 bg-emerald-500/5"
          : "border-amber-500/30 bg-amber-500/5"
      )}
    >
      {ok ? (
        <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
      ) : (
        <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        {detail ? (
          <p className="mt-0.5 text-xs text-muted-foreground leading-snug">{detail}</p>
        ) : null}
      </div>
    </div>
  );
}

function ToggleRow({
  id,
  checked,
  onChange,
  label,
  hint,
  highlight,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4",
        highlight ? "border-primary/30 bg-primary/5" : "border-border/60 bg-muted/10"
      )}
    >
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
          {label}
        </Label>
        {hint ? <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{hint}</p> : null}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors",
          checked ? "bg-primary" : "bg-muted-foreground/30"
        )}
      >
        <span
          className={cn(
            "inline-block size-5 transform rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

export function NotificationSettingsPanel() {
  const t = useTranslations("settings");
  const tC = useTranslations("common");
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notification-preferences"],
    queryFn: () => jsonFetch<{ data: NotificationPref }>("/api/notification-preferences"),
  });

  const { data: deliveryData } = useQuery({
    queryKey: ["notification-delivery-status"],
    queryFn: () => jsonFetch<{ data: DeliveryStatus }>("/api/notification-delivery/status"),
    staleTime: 60_000,
  });

  const delivery = deliveryData?.data;
  const [form, setForm] = useState<NotificationPref | null>(null);

  useEffect(() => {
    if (data?.data) setForm(data.data);
  }, [data]);

  const save = useMutation({
    mutationFn: (body: NotificationPref) =>
      jsonFetch("/api/notification-preferences", { method: "PUT", body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success(t("saved"));
      void qc.invalidateQueries({ queryKey: ["notification-preferences"] });
      void qc.invalidateQueries({ queryKey: ["notification-delivery-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const testEmail = useMutation({
    mutationFn: () => jsonFetch<{ ok: boolean; provider?: string }>("/api/email/test", { method: "POST" }),
    onSuccess: (res) => {
      toast.success(t("testEmailOk", { provider: res.provider || "email" }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !form) {
    return (
      <div className="h-64 max-w-2xl animate-pulse rounded-xl border border-border/60 bg-muted/20" />
    );
  }

  const setBool = (key: keyof NotificationPref, v: boolean) =>
    setForm((f) => (f ? { ...f, [key]: v } : f));

  const emailReady = delivery?.emailConfigured ?? false;
  const cronReady = delivery?.jobsAuthConfigured ?? false;
  const loginReminderOn = form.noLoginReminderEmail;

  return (
    <div className="space-y-6">
      <Card className="border-border/70 shadow-sm overflow-hidden">
        <CardHeader className="pb-3 bg-gradient-to-br from-primary/8 via-transparent to-transparent">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="size-4 text-primary" />
            {t("deliveryTitle")}
          </CardTitle>
          <CardDescription>{t("deliveryDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <StatusPill
              ok={emailReady}
              label={emailReady ? t("emailReady") : t("emailMissing")}
              detail={
                emailReady
                  ? t("emailReadyDetail", {
                      provider: delivery?.emailProvider || "smtp",
                      from: delivery?.emailFrom || delivery?.email || "",
                    })
                  : t("emailMissingDetail")
              }
            />
            <StatusPill
              ok={cronReady}
              label={cronReady ? t("cronReady") : t("cronMissing")}
              detail={cronReady ? t("cronReadyDetail") : t("cronMissingDetail")}
            />
          </div>

          {delivery?.lastLoginAt ? (
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
              <Clock className="size-3.5 shrink-0" />
              {t("lastActivity", {
                hours: delivery.hoursSinceActivity ?? 0,
              })}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
              <Clock className="size-3.5 shrink-0" />
              {t("noActivityYet")}
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5"
              disabled={!emailReady || testEmail.isPending}
              onClick={() => testEmail.mutate()}
            >
              <Send className="size-3.5" />
              {testEmail.isPending ? tC("loading") : t("testEmail")}
            </Button>
          </div>

          {!emailReady || !cronReady ? (
            <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
              <p className="font-medium text-foreground mb-1">{t("setupGuideTitle")}</p>
              <ul className="list-disc ps-4 space-y-1">
                <li>{t("setupGuideResend")}</li>
                <li>{t("setupGuideCron")}</li>
                <li>{t("setupGuideToggle")}</li>
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Mail className="size-4 text-primary" />
            {t("emailSection")}
          </CardTitle>
          <CardDescription>{t("emailSectionDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            id="no-login"
            checked={form.noLoginReminderEmail}
            onChange={(v) => setBool("noLoginReminderEmail", v)}
            label={t("noLogin")}
            hint={t("noLoginDesc")}
            highlight
          />
          <ToggleRow
            id="digest"
            checked={form.digestEmailEnabled}
            onChange={(v) => setBool("digestEmailEnabled", v)}
            label={t("digestEmail")}
            hint={t("digestEmailDesc")}
          />
          <ToggleRow
            id="mirror"
            checked={form.mirrorInAppToEmail}
            onChange={(v) => setBool("mirrorInAppToEmail", v)}
            label={t("mirrorInApp")}
            hint={t("mirrorInAppDesc")}
          />
          <ToggleRow
            id="recurring"
            checked={form.recurringDueRemindersEnabled}
            onChange={(v) => setBool("recurringDueRemindersEnabled", v)}
            label={t("recurringDue")}
            hint={t("recurringDueDesc")}
          />
          <ToggleRow
            id="project-payment"
            checked={form.projectPaymentRemindersEnabled}
            onChange={(v) => setBool("projectPaymentRemindersEnabled", v)}
            label={t("projectPaymentReminders")}
            hint={t("projectPaymentRemindersDesc")}
          />
          <ToggleRow
            id="net-drop"
            checked={form.netDecreaseEmail}
            onChange={(v) => setBool("netDecreaseEmail", v)}
            label={t("netDrop")}
            hint={t("netDropDesc")}
          />
          <ToggleRow
            id="inactivity"
            checked={form.inactivityNudgeEmail}
            onChange={(v) => setBool("inactivityNudgeEmail", v)}
            label={t("inactivityNudge")}
            hint={t("inactivityNudgeDesc")}
          />
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            {t("inAppSection")}
          </CardTitle>
          <CardDescription>{t("inAppSectionDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ToggleRow
            id="activity"
            checked={form.activityNotificationsEnabled}
            onChange={(v) => setBool("activityNotificationsEnabled", v)}
            label={t("activityNotif")}
            hint={t("activityNotifDesc")}
          />
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="low-net">{t("lowNet")}</Label>
            <p className="text-xs text-muted-foreground">{t("lowNetDesc")}</p>
            <Input
              id="low-net"
              type="number"
              min={0}
              step="0.01"
              className="h-11"
              placeholder={t("lowNetPh")}
              value={form.lowBalanceThreshold ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => {
                  if (!f) return f;
                  if (v === "") return { ...f, lowBalanceThreshold: null };
                  const n = parseFloat(v);
                  return { ...f, lowBalanceThreshold: Number.isFinite(n) && n > 0 ? n : null };
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            {t("rulesSection")}
          </CardTitle>
          <CardDescription>{t("rulesSectionDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:max-w-xs">
            <Label htmlFor="inact">{t("inactivityDays")}</Label>
            <p className="text-xs text-muted-foreground">{t("inactivityDaysHint")}</p>
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
            <p className="text-xs text-muted-foreground">{t("digestCadenceHint")}</p>
            <select
              id="cad"
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
              value={form.digestCadence}
              onChange={(e) =>
                setForm((f) =>
                  f ? { ...f, digestCadence: e.target.value === "daily" ? "daily" : "weekly" } : f
                )
              }
            >
              <option value="daily">{t("cadDaily")}</option>
              <option value="weekly">{t("cadWeekly")}</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {loginReminderOn && emailReady && cronReady ? (
        <p className="text-xs text-muted-foreground rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
          {t("reminderActive", {
            tz: delivery?.reminderTimezone || "Africa/Cairo",
            start: delivery?.reminderWindow.start ?? 10,
            end: delivery?.reminderWindow.end ?? 23,
          })}
        </p>
      ) : null}

      <Button
        type="button"
        className="min-h-11 w-full min-[400px]:w-auto"
        onClick={() => save.mutate(form)}
        disabled={save.isPending}
      >
        {save.isPending ? tC("loading") : tC("save")}
      </Button>
    </div>
  );
}
