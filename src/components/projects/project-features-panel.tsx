"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, Pause, Play, Plus, Square, TimerReset } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { jsonFetch } from "@/lib/fetcher";
import { formatMoney } from "@/lib/format";
import type { FeatureDto, FeatureTaskDto } from "@/types/feature";

type Props = { projectId: string };

function formatSeconds(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function liveSeconds(session: FeatureTaskDto["activeSession"], now: number) {
  if (!session) return 0;
  if (session.status !== "running" || !session.activeStartedAt) return session.elapsedSeconds;
  return session.elapsedSeconds + Math.max(0, Math.floor((now - new Date(session.activeStartedAt).getTime()) / 1000));
}

export function ProjectFeaturesPanel({ projectId }: Props) {
  const t = useTranslations("projects");
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [taskFeatureId, setTaskFeatureId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pricingMode, setPricingMode] = useState<FeatureDto["pricingMode"]>("pricing_pending");
  const [featureType, setFeatureType] = useState<FeatureDto["type"]>("new_feature");
  const [hourlyRate, setHourlyRate] = useState("500");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [approvedPrice, setApprovedPrice] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const featuresQ = useQuery({
    queryKey: ["project-features", projectId],
    queryFn: () => jsonFetch<{ data: FeatureDto[] }>(`/api/project-jobs/${projectId}/features`),
  });

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["project-features", projectId] });
  };

  const createFeature = useMutation({
    mutationFn: () => jsonFetch<{ data: FeatureDto }>(`/api/project-jobs/${projectId}/features`, {
      method: "POST",
      body: JSON.stringify({
        title,
        description,
        pricingMode,
        type: featureType,
        hourlyRateEgp: Number(hourlyRate) || 500,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
        approvedPriceEgp: approvedPrice ? Number(approvedPrice) : null,
      }),
    }),
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setPricingMode("pricing_pending");
      setFeatureType("new_feature");
      setHourlyRate("500");
      setEstimatedMinutes("");
      setApprovedPrice("");
      setShowCreate(false);
      refresh();
    },
  });

  const addTask = useMutation({
    mutationFn: (featureId: string) => jsonFetch(`/api/features/${featureId}/tasks`, {
      method: "POST",
      body: JSON.stringify({ title: taskTitle, defaultBillable: true }),
    }),
    onSuccess: () => {
      setTaskTitle("");
      setTaskFeatureId(null);
      refresh();
    },
  });

  const timer = useMutation({
    mutationFn: ({ task, action, sessionId }: { task: FeatureTaskDto; action: string; sessionId?: string }) =>
      jsonFetch(`/api/tasks/${task.id}/timer`, {
        method: "POST",
        body: JSON.stringify({ action, sessionId }),
      }),
    onSuccess: refresh,
  });

  const hasRunning = useMemo(
    () => (featuresQ.data?.data ?? []).some((feature) => feature.tasks.some((task) => task.activeSession?.status === "running")),
    [featuresQ.data]
  );

  useEffect(() => {
    if (!hasRunning) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hasRunning]);

  const features = featuresQ.data?.data ?? [];

  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-medium text-sm">{t("featuresTitle")}</h2>
          <p className="text-xs text-muted-foreground">{t("featuresHint")}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowCreate((value) => !value)}>
          <Plus className="me-1.5 size-3.5" />
          {t("addFeature")}
        </Button>
      </div>

      {showCreate && (
        <div className="grid gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>{t("featureName")}</Label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("featureNamePh")} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>{t("featureDescription")}</Label>
            <Input value={description} onChange={(event) => setDescription(event.target.value)} placeholder={t("featureDescriptionPh")} />
          </div>
          <div className="space-y-1">
            <Label>{t("featureType")}</Label>
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={featureType} onChange={(event) => setFeatureType(event.target.value as FeatureDto["type"])}>
              <option value="new_feature">{t("featureType_new_feature")}</option>
              <option value="technical_support">{t("featureType_technical_support")}</option>
              <option value="ui_modification">{t("featureType_ui_modification")}</option>
              <option value="backend_modification">{t("featureType_backend_modification")}</option>
              <option value="business_logic_change">{t("featureType_business_logic_change")}</option>
              <option value="bug_fix">{t("featureType_bug_fix")}</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>{t("featurePricing")}</Label>
            <select className="h-9 w-full rounded-md border bg-background px-2 text-sm" value={pricingMode} onChange={(event) => setPricingMode(event.target.value as FeatureDto["pricingMode"])}>
              <option value="pricing_pending">{t("pricingPending")}</option>
              <option value="hourly">{t("pricingHourly")}</option>
              <option value="fixed">{t("pricingFixed")}</option>
              <option value="free">{t("pricingFree")}</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label>{t("hourlyRate")}</Label>
            <Input type="number" min="0" value={hourlyRate} onChange={(event) => setHourlyRate(event.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>{t("estimatedMinutes")}</Label>
            <Input type="number" min="0" value={estimatedMinutes} onChange={(event) => setEstimatedMinutes(event.target.value)} placeholder={t("optional")} />
          </div>
          <div className="space-y-1">
            <Label>{t("approvedPriceEgp")}</Label>
            <Input type="number" min="0" value={approvedPrice} onChange={(event) => setApprovedPrice(event.target.value)} placeholder={t("optional")} />
          </div>
          <div className="flex items-end gap-2 sm:col-span-2">
            <Button type="button" size="sm" disabled={!title.trim() || createFeature.isPending} onClick={() => createFeature.mutate()}>
              {createFeature.isPending ? t("savingFeature") : t("saveFeature")}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowCreate(false)}>{t("cancelFeature")}</Button>
          </div>
        </div>
      )}

      {featuresQ.isLoading ? <p className="text-sm text-muted-foreground">{t("loadingFeatures")}</p> : null}
      {!featuresQ.isLoading && features.length === 0 ? <p className="text-sm text-muted-foreground">{t("noFeatures")}</p> : null}

      <div className="space-y-2">
        {features.map((feature) => {
          const isOpen = expanded === feature.id;
          return (
            <div key={feature.id} className="rounded-lg border border-border/60 bg-background/60 p-3">
              <button type="button" className="flex w-full flex-wrap items-center justify-between gap-2 text-start" onClick={() => setExpanded(isOpen ? null : feature.id)}>
                <span className="min-w-0">
                  <span className="block font-medium">{feature.title}</span>
                  <span className="text-xs text-muted-foreground">{feature.tasks.length} {t("tasks")} · {formatSeconds(feature.trackedSeconds)}</span>
                </span>
                <span className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="secondary">{t(`featureStatus_${feature.status}`)}</Badge>
                  <Badge variant="outline">{t(`featurePricing_${feature.pricingMode}`)}</Badge>
                </span>
              </button>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                <span className="rounded bg-muted/40 px-2 py-1"><b>{t("trackedTime")}:</b> {formatSeconds(feature.trackedSeconds)}</span>
                <span className="rounded bg-muted/40 px-2 py-1"><b>{t("billableTime")}:</b> {formatSeconds(feature.billableSeconds)}</span>
                <span className="rounded bg-muted/40 px-2 py-1"><b>{t("calculatedCost")}:</b> {formatMoney(feature.calculatedCostEgp)}</span>
                <span className="rounded bg-muted/40 px-2 py-1"><b>{t("collectedFeature")}:</b> {formatMoney(feature.collectedAmountEgp)}</span>
              </div>
              {isOpen && (
                <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">{t("tasks")}</span>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setTaskFeatureId(taskFeatureId === feature.id ? null : feature.id)}>
                      <Plus className="me-1 size-3.5" />{t("addTask")}
                    </Button>
                  </div>
                  {taskFeatureId === feature.id && (
                    <div className="flex gap-2">
                      <Input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder={t("taskNamePh")} />
                      <Button type="button" size="sm" disabled={!taskTitle.trim() || addTask.isPending} onClick={() => addTask.mutate(feature.id)}>{t("add")}</Button>
                    </div>
                  )}
                  <FeaturePriceAndPayments feature={feature} onRefresh={refresh} t={t} />
                  {feature.tasks.map((task) => <TaskRow key={task.id} task={task} now={now} onTimer={(action, sessionId) => timer.mutate({ task, action, sessionId })} busy={timer.isPending} t={t} />)}
                  {feature.tasks.length === 0 ? <p className="text-xs text-muted-foreground">{t("noTasks")}</p> : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

type FeaturePayment = {
  id: string;
  amountEgp: number;
  isCollected: boolean;
  paymentMethod: "cash" | "card" | "unspecified";
  date: string;
};

function FeaturePriceAndPayments({ feature, onRefresh, t }: { feature: FeatureDto; onRefresh: () => void; t: (key: string) => string }) {
  const [price, setPrice] = useState(feature.approvedPriceEgp?.toString() ?? "");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [collectedNow, setCollectedNow] = useState(false);
  const paymentsQ = useQuery({
    queryKey: ["feature-payments", feature.id],
    queryFn: () => jsonFetch<{ data: FeaturePayment[] }>(`/api/features/${feature.id}/payments`),
  });
  const approve = useMutation({
    mutationFn: () => jsonFetch(`/api/features/${feature.id}`, {
      method: "PUT",
      body: JSON.stringify({ pricingMode: feature.pricingMode === "pricing_pending" ? "fixed" : feature.pricingMode, approvedPriceEgp: Number(price) }),
    }),
    onSuccess: onRefresh,
  });
  const addPayment = useMutation({
    mutationFn: () => jsonFetch(`/api/features/${feature.id}/payments`, {
      method: "POST",
      body: JSON.stringify({ amount: Number(paymentAmount), isCollected: collectedNow, paymentMethod: collectedNow ? "cash" : "unspecified" }),
    }),
    onSuccess: () => { setPaymentAmount(""); setCollectedNow(false); onRefresh(); void paymentsQ.refetch(); },
  });
  const collect = useMutation({
    mutationFn: (id: string) => jsonFetch(`/api/feature-payments/${id}`, { method: "POST", body: JSON.stringify({ action: "collect", paymentMethod: "cash" }) }),
    onSuccess: () => { onRefresh(); void paymentsQ.refetch(); },
  });
  return (
    <div className="space-y-2 rounded-md border border-dashed border-border/60 p-2">
      {feature.pricingMode !== "free" && feature.approvedPriceEgp == null ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-40 flex-1 space-y-1"><Label className="text-xs">{t("approvedPriceEgp")}</Label><Input type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="EGP" /></div>
          <Button type="button" size="sm" disabled={!price || approve.isPending} onClick={() => approve.mutate()}>{t("approvePrice")}</Button>
        </div>
      ) : null}
      {feature.approvedPriceEgp != null && feature.pricingMode !== "free" ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-32 flex-1 space-y-1"><Label className="text-xs">{t("featurePaymentAmount")}</Label><Input type="number" min="0" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} placeholder={t("amountPlaceholder")} /></div>
          <label className="flex h-9 items-center gap-1.5 text-xs"><input type="checkbox" checked={collectedNow} onChange={(event) => setCollectedNow(event.target.checked)} />{t("collectNow")}</label>
          <Button type="button" size="sm" disabled={!paymentAmount || addPayment.isPending} onClick={() => addPayment.mutate()}>{t("addFeaturePayment")}</Button>
        </div>
      ) : null}
      {(paymentsQ.data?.data ?? []).map((payment) => (
        <div key={payment.id} className="flex items-center justify-between gap-2 text-xs">
          <span>{formatMoney(payment.amountEgp)} · {payment.isCollected ? t("statusCollected") : t("statusPending")}</span>
          {!payment.isCollected ? <Button type="button" size="sm" variant="ghost" disabled={collect.isPending} onClick={() => collect.mutate(payment.id)}>{t("collectBtn")}</Button> : null}
        </div>
      ))}
    </div>
  );
}

function TaskRow({ task, now, onTimer, busy, t }: { task: FeatureTaskDto; now: number; onTimer: (action: string, sessionId?: string) => void; busy: boolean; t: (key: string) => string }) {
  const running = task.activeSession?.status === "running";
  const last = task.lastSession;
  const elapsed = running ? liveSeconds(task.activeSession, now) : last?.elapsedSeconds ?? task.trackedSeconds;
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/50 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <Clock3 className="size-3.5 text-muted-foreground" />
          <span className="truncate">{task.title}</span>
          <Badge variant={task.defaultBillable ? "default" : "outline"} className="text-[0.6rem]">{task.defaultBillable ? t("billable") : t("notBillable")}</Badge>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><TimerReset className="size-3" />{formatSeconds(elapsed)}</div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {running ? (
          <>
            <Button type="button" size="icon-sm" variant="outline" disabled={busy} title={t("pauseTimer")} onClick={() => onTimer("pause", task.activeSession?.id)}><Pause className="size-3.5" /></Button>
            <Button type="button" size="icon-sm" variant="outline" disabled={busy} title={t("stopTimer")} onClick={() => onTimer("stop", task.activeSession?.id)}><Square className="size-3.5" /></Button>
          </>
        ) : last?.status === "paused" ? (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onTimer("resume", last.id)}><Play className="me-1 size-3.5" />{t("resumeTimer")}</Button>
        ) : (
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onTimer("start")}><Play className="me-1 size-3.5" />{t("startTimer")}</Button>
        )}
        {task.status === "completed" ? <Check className="ms-1 size-4 text-emerald-600" /> : null}
      </div>
    </div>
  );
}
