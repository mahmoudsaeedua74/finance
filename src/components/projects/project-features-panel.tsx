"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, FileText, Pause, Pencil, Play, Plus, Square, TimerReset } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { PaymentMethodField } from "@/components/forms/payment-method-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { jsonFetch } from "@/lib/fetcher";
import { formatMoney } from "@/lib/format";
import { defaultFormDateYmd } from "@/lib/ymd";
import { useFinanceInvalidation } from "@/hooks/use-finance-invalidation";
import { roundMoney } from "@/lib/currency";
import { newEntryId } from "@/lib/client-entry-id";
import type { FeatureDto, FeatureTaskDto } from "@/types/feature";

type Props = {
  projectId: string;
  projectFeatures?: FeatureDto[];
  featuresLoading: boolean;
  featuresError: Error | null;
  featuresUpdatedAt: number;
  onInvoice: (featureId: string) => void;
};
type TimerCommand =
  | { action: "start" | "pause" | "resume" | "stop"; sessionId?: string }
  | { action: "manual"; sessionId?: string; entryId?: string; elapsedSeconds: number; reason: string };

function formatSeconds(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function ProjectFeaturesPanel({
  projectId, projectFeatures, featuresLoading, featuresError, featuresUpdatedAt, onInvoice,
}: Props) {
  const t = useTranslations("projects");
  const qc = useQueryClient();
  const { invalidateProjects } = useFinanceInvalidation();
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [taskFeatureId, setTaskFeatureId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pricingMode, setPricingMode] = useState<FeatureDto["pricingMode"]>("hourly");
  const [featureType, setFeatureType] = useState<FeatureDto["type"]>("new_feature");
  const [hourlyRate, setHourlyRate] = useState("500");
  const [approvedPrice, setApprovedPrice] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [collectTask, setCollectTask] = useState<FeatureTaskDto | null>(null);
  const [taskCollectionDate, setTaskCollectionDate] = useState("");
  const [taskPaymentMethod, setTaskPaymentMethod] = useState<"cash" | "card">("cash");

  const refresh = () => {
    return qc.invalidateQueries({ queryKey: ["project-features", projectId] });
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
        approvedPriceEgp: pricingMode === "fixed" && approvedPrice ? Number(approvedPrice) : null,
      }),
    }),
    onSuccess: () => {
      setTitle("");
      setDescription("");
      setPricingMode("hourly");
      setFeatureType("new_feature");
      setHourlyRate("500");
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
    mutationFn: ({ taskId, command }: { taskId: string; command: TimerCommand }) =>
      jsonFetch(`/api/tasks/${taskId}/timer`, {
        method: "POST",
        body: JSON.stringify(command),
      }),
    onSuccess: refresh,
    onError: (error, { command }) => {
      if (command.action !== "manual") toast.error(error.message);
    },
  });

  const collectTaskPayment = useMutation({
    mutationFn: ({ task, date, method }: { task: FeatureTaskDto; date: string; method: "cash" | "card" }) =>
      jsonFetch(`/api/features/${task.featureId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          taskId: task.id,
          entryId: task.billing?.entryId,
          amount: task.billing?.collectableAmountEgp,
          date,
          isCollected: true,
          paymentMethod: method,
        }),
      }),
    onSuccess: async (_, { task }) => {
      invalidateProjects();
      await Promise.all([
        refresh(),
        qc.invalidateQueries({ queryKey: ["feature-payments", task.featureId] }),
        qc.invalidateQueries({ queryKey: ["project-job", projectId] }),
        qc.invalidateQueries({ queryKey: ["project-invoice", projectId] }),
      ]);
      setCollectTask(null);
      toast.success(t("collectedOk"));
    },
    onError: refresh,
  });

  function openTaskCollection(task: FeatureTaskDto) {
    collectTaskPayment.reset();
    setTaskCollectionDate(defaultFormDateYmd());
    setTaskPaymentMethod("cash");
    setCollectTask(task);
  }

  const features = useMemo(() => (projectFeatures ?? []).filter((feature) => !feature.isArchived), [projectFeatures]);
  const hasRunning = features.some((feature) => feature.tasks.some((task) => task.activeSession?.status === "running"));

  useEffect(() => {
    if (!hasRunning) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hasRunning]);

  return (
    <section className="space-y-3 rounded-xl border border-border/60 bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-medium text-sm">{t("featuresTitle")}</h2>
          <p className="text-xs text-muted-foreground">{t("featuresHint")}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setShowCreate(true)}>
          <Plus className="me-1.5 size-3.5" />
          {t("addFeature")}
        </Button>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("addFeatureTitle")}</DialogTitle>
            <DialogDescription>{t("addFeatureHint")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
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
          {pricingMode === "fixed" && (
            <div className="space-y-1 sm:col-span-2">
              <Label>{t("approvedPriceEgp")}</Label>
              <Input autoFocus type="number" min="0" value={approvedPrice} onChange={(event) => setApprovedPrice(event.target.value)} placeholder={t("fixedPricePh")} />
              <p className="text-xs text-muted-foreground">{t("fixedPriceHint")}</p>
            </div>
          )}
          </div>
          <DialogFooter>
            <Button type="button" disabled={!title.trim() || (pricingMode === "fixed" && !approvedPrice) || createFeature.isPending} onClick={() => createFeature.mutate()}>
              {createFeature.isPending ? t("savingFeature") : t("saveFeature")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>{t("cancelFeature")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {featuresLoading && <p className="text-sm text-muted-foreground">{t("loadingFeatures")}</p>}
      {featuresError && <p role="alert" className="text-sm text-destructive">{featuresError.message}</p>}
      {!featuresLoading && !featuresError && features.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("noFeatures")}</p>
      )}

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
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
                <span className="rounded bg-muted/40 px-2 py-1"><b>{t("trackedTime")}:</b> {formatSeconds(feature.trackedSeconds)}</span>
                <span className="rounded bg-muted/40 px-2 py-1"><b>{t("billableTime")}:</b> {formatSeconds(feature.billableSeconds)}</span>
                <span className="rounded bg-muted/40 px-2 py-1"><b>{t("calculatedCost")}:</b> {formatMoney(feature.calculatedCostEgp)}</span>
                <span className="rounded bg-muted/40 px-2 py-1"><b>{t("collectedFeature")}:</b> {formatMoney(feature.collectedAmountEgp)}</span>
                <span className="rounded bg-muted/40 px-2 py-1"><b>{t("featureOutstanding")}:</b> {formatMoney(feature.outstandingAmountEgp)}</span>
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
                      <Button type="button" size="sm" disabled={!taskTitle.trim() || addTask.isPending} onClick={() => addTask.mutate(feature.id)}>{t("saveTask")}</Button>
                    </div>
                  )}
                  <FeaturePriceAndPayments feature={feature} onRefresh={refresh} t={t} />
                  <Button type="button" variant="outline" size="sm" onClick={() => onInvoice(feature.id)}>
                    <FileText className="size-3.5" />
                    {t("invoiceFeatureButton")}
                  </Button>
                  {feature.tasks.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      liveExtraSeconds={Math.max(0, Math.floor((now - featuresUpdatedAt) / 1000))}
                      onTimer={(command) => timer.mutate({ taskId: task.id, command })}
                      onManualTime={(command) => timer.mutateAsync({ taskId: task.id, command })}
                      onCollect={openTaskCollection}
                      busy={timer.isPending || collectTaskPayment.isPending}
                      t={t}
                    />
                  ))}
                  {feature.tasks.length === 0 ? <p className="text-xs text-muted-foreground">{t("noTasks")}</p> : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <Dialog open={Boolean(collectTask)} onOpenChange={(open) => {
        if (!open && !collectTaskPayment.isPending) setCollectTask(null);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("collectTitle")}</DialogTitle>
            <DialogDescription>{collectTask?.title}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-2 rounded-lg border p-3">
            <span>{t("featurePaymentAmount")}</span>
            <strong dir="ltr">{formatMoney(collectTask?.billing?.collectableAmountEgp ?? 0)}</strong>
          </div>
          <Label className="grid gap-1">
            {t("collectionDate")}
            <Input type="date" value={taskCollectionDate} max={defaultFormDateYmd()}
              onChange={(event) => setTaskCollectionDate(event.target.value)} />
          </Label>
          <PaymentMethodField optional={false} value={taskPaymentMethod}
            onChange={(value) => { if (value === "cash" || value === "card") setTaskPaymentMethod(value); }} />
          {collectTaskPayment.error && <p role="alert" className="text-sm text-destructive">{collectTaskPayment.error.message}</p>}
          <DialogFooter>
            <Button type="button" disabled={!taskCollectionDate || taskCollectionDate > defaultFormDateYmd() || collectTaskPayment.isPending}
              onClick={() => {
                if (collectTask) collectTaskPayment.mutate({ task: collectTask, date: taskCollectionDate, method: taskPaymentMethod });
              }}>{t("collectBtn")}</Button>
            <Button type="button" variant="ghost" disabled={collectTaskPayment.isPending} onClick={() => setCollectTask(null)}>
              {t("cancelFeature")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

type FeaturePayment = {
  id: string;
  taskId: string | null;
  amountEgp: number;
  isCollected: boolean;
  paymentMethod: "cash" | "card" | "unspecified";
  date: string;
  collectedAt: string | null;
};

function FeaturePriceAndPayments({
  feature, onRefresh, t,
}: {
  feature: FeatureDto;
  onRefresh: () => Promise<void>;
  t: (key: string, values?: { amount: string }) => string;
}) {
  const qc = useQueryClient();
  const { invalidateProjects } = useFinanceInvalidation();
  const [price, setPrice] = useState("");
  const [draft, setDraft] = useState<{ kind: "scheduled" | "collect"; paymentId?: string; entryId?: string } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(() => defaultFormDateYmd());
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const paymentsQ = useQuery({
    queryKey: ["feature-payments", feature.id],
    queryFn: () => jsonFetch<{ data: FeaturePayment[] }>(`/api/features/${feature.id}/payments`),
  });
  const payments = paymentsQ.data?.data ?? [];
  const scheduled = payments.reduce((sum, row) => sum + (row.isCollected ? 0 : row.amountEgp), 0);
  const hourly = feature.pricingMode === "hourly";
  const taskBalance = feature.tasks.reduce((sum, task) => sum + (task.billing?.collectableAmountEgp ?? 0), 0);
  const unallocated = Math.max(0, roundMoney(feature.outstandingAmountEgp - scheduled - taskBalance));
  const visiblePayments = hourly ? payments.filter((payment) => !payment.taskId) : payments;
  const approved = feature.approvedPriceEgp != null;

  const approve = useMutation({
    mutationFn: (amount: number) => jsonFetch(`/api/features/${feature.id}`, {
      method: "PUT",
      body: JSON.stringify({
        pricingMode: feature.pricingMode === "pricing_pending" ? "fixed" : feature.pricingMode,
        approvedPriceEgp: amount,
      }),
    }),
    onSuccess: async () => {
      await onRefresh();
      void qc.invalidateQueries({ queryKey: ["project-invoice", feature.projectId] });
    },
  });

  const savePayment = useMutation({
    mutationFn: (input: { kind: "scheduled" | "collect"; paymentId?: string; entryId?: string; amount: number; date: string; method: "cash" | "card" }) => {
      const date = new Date(input.date).toISOString();
      if (input.paymentId) {
        return jsonFetch(`/api/feature-payments/${input.paymentId}`, {
          method: "POST",
          body: JSON.stringify({ action: "collect", date, paymentMethod: input.method }),
        });
      }
      return jsonFetch(`/api/features/${feature.id}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amount: input.amount,
          entryId: input.entryId,
          date,
          isCollected: input.kind === "collect",
          paymentMethod: input.kind === "collect" ? input.method : "unspecified",
        }),
      });
    },
    onSuccess: async (_, input) => {
      if (input.kind === "collect") {
        invalidateProjects();
        toast.success(t("collectedOk"));
      }
      await Promise.all([
        onRefresh(),
        paymentsQ.refetch(),
        qc.invalidateQueries({ queryKey: ["project-job", feature.projectId] }),
        qc.invalidateQueries({ queryKey: ["project-invoice", feature.projectId] }),
      ]);
      setDraft(null);
    },
  });

  function openPayment(kind: "scheduled" | "collect", payment?: FeaturePayment) {
    savePayment.reset();
    setPaymentAmount(String(payment?.amountEgp ?? unallocated));
    setPaymentDate(defaultFormDateYmd());
    setMethod("cash");
    setDraft(payment ? { kind, paymentId: payment.id } : { kind, entryId: newEntryId() });
  }

  const collecting = draft?.kind === "collect";
  const amount = Number(paymentAmount);
  const validPayment = Boolean(paymentDate) && Number.isFinite(amount) && roundMoney(amount) > 0
    && (Boolean(draft?.paymentId) || roundMoney(amount) <= unallocated);
  const busy = approve.isPending || savePayment.isPending;
  if (hourly && !visiblePayments.length && !(approved && unallocated > 0) && !paymentsQ.error) return null;
  const panel = (
    <div className="space-y-3 rounded-md border border-dashed border-border/60 p-3">
      <div>
        <p className="text-sm font-medium">{t("featurePaymentsTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("featurePaymentsHint")}</p>
      </div>
      {!hourly && feature.pricingMode !== "free" && !approved && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <Label className="min-w-40 flex-1 space-y-1 text-xs">
              {t("approvedPriceEgp")}
              <Input type="number" min="0.01" step="0.01" value={price}
                onChange={(event) => setPrice(event.target.value)} placeholder={t("amountPlaceholder")} />
            </Label>
            <Button type="button" size="sm" variant="outline"
              disabled={!Number.isFinite(Number(price)) || roundMoney(Number(price)) <= 0 || busy}
              onClick={() => approve.mutate(Number(price))}>
              {t("approvePrice")}
            </Button>
          </div>
          {approve.error && <p role="alert" className="text-xs text-destructive">{approve.error.message}</p>}
        </div>
      )}
      {approved && feature.pricingMode !== "free" && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {t("approvedPriceEgp")} <bdi className="font-semibold">{formatMoney(feature.approvedPriceEgp ?? 0)}</bdi>
            {" · "}{t("featureOutstanding")} <bdi className="font-semibold">{formatMoney(feature.outstandingAmountEgp)}</bdi>
          </p>
          {unallocated > 0 && paymentsQ.isSuccess && !paymentsQ.isFetching && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={busy} onClick={() => openPayment("collect")}>{t("collectBtn")}</Button>
              <Button type="button" size="sm" variant="outline" disabled={busy}
                onClick={() => openPayment("scheduled")}>{t("scheduleFeaturePayment")}</Button>
            </div>
          )}
        </div>
      )}
      {paymentsQ.error && <p role="alert" className="text-xs text-destructive">{paymentsQ.error.message}</p>}
      {visiblePayments.map((payment) => (
        <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-border/50 px-2 py-1.5 text-xs">
          <span>
            <bdi>{formatMoney(payment.amountEgp)}</bdi> · {t(payment.isCollected ? "statusCollected" : "statusPending")} ·{" "}
            <bdi>{(payment.collectedAt ?? payment.date).slice(0, 10)}</bdi>
          </span>
          {!payment.isCollected && (
            <Button type="button" size="sm" variant="outline" disabled={busy}
              onClick={() => openPayment("collect", payment)}>{t("collectBtn")}</Button>
          )}
        </div>
      ))}
      <Dialog open={Boolean(draft)} onOpenChange={(open) => { if (!open && !busy) setDraft(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t(collecting ? "collectTitle" : "scheduleFeaturePayment")}</DialogTitle>
            <DialogDescription>{feature.title}</DialogDescription>
          </DialogHeader>
          <Label className="grid gap-1">
            {t("featurePaymentAmount")}
            <Input type="number" min="0.01" max={draft?.paymentId ? undefined : unallocated} step="0.01"
              readOnly={Boolean(draft?.paymentId)} value={paymentAmount}
              onChange={(event) => setPaymentAmount(event.target.value)} />
          </Label>
          <Label className="grid gap-1">
            {t(collecting ? "collectionDate" : "paymentDate")}
            <Input type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
          </Label>
          {collecting && (
            <PaymentMethodField optional={false} size="compact" value={method}
              onChange={(value) => { if (value === "cash" || value === "card") setMethod(value); }} />
          )}
          {savePayment.error && <p role="alert" className="text-sm text-destructive">{savePayment.error.message}</p>}
          <DialogFooter>
            <Button type="button" disabled={busy || !validPayment} onClick={() => {
              if (!draft) return;
              savePayment.mutate({ ...draft, amount, date: paymentDate, method });
            }}>{t(collecting ? "collectBtn" : "scheduleFeaturePayment")}</Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setDraft(null)}>{t("cancelFeature")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
  return hourly ? (
    <details className="space-y-2">
      <summary className="w-fit cursor-pointer text-xs text-muted-foreground">{t("otherFeaturePayments")}</summary>
      {panel}
    </details>
  ) : panel;
}

function TaskRow({
  task, liveExtraSeconds, onTimer, onManualTime, onCollect, busy, t,
}: {
  task: FeatureTaskDto;
  liveExtraSeconds: number;
  onTimer: (command: TimerCommand) => void;
  onManualTime: (command: TimerCommand) => Promise<unknown>;
  onCollect: (task: FeatureTaskDto) => void;
  busy: boolean;
  t: (key: string, values?: { amount: string }) => string;
}) {
  const active = task.activeSession;
  const last = task.lastSession;
  const [draft, setDraft] = useState<{ sessionId?: string; entryId?: string } | null>(null);
  const [parts, setParts] = useState(["0", "0", "0"]);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const paused = last?.status === "paused";
  const collectableAmount = task.billing?.collectableAmountEgp ?? 0;
  const elapsed = task.trackedSeconds + (active ? liveExtraSeconds : 0);
  const [hours, minutes, seconds] = parts.map(Number);
  const duration = hours * 3600 + minutes * 60 + seconds;
  const validDuration = [hours, minutes, seconds].every((part) => Number.isSafeInteger(part) && part >= 0)
    && minutes <= 59 && seconds <= 59 && Number.isSafeInteger(duration)
    && (duration > 0 || Boolean(draft?.sessionId));

  function openManualTime(session?: NonNullable<FeatureTaskDto["lastSession"]>) {
    const elapsedSeconds = session?.elapsedSeconds ?? 0;
    setParts([
      String(Math.floor(elapsedSeconds / 3600)),
      String(Math.floor((elapsedSeconds % 3600) / 60)),
      String(elapsedSeconds % 60),
    ]);
    setReason("");
    setError("");
    setDraft(session ? { sessionId: session.id } : { entryId: newEntryId() });
  }

  async function saveManualTime() {
    if (!draft || !validDuration) return;
    setError("");
    try {
      await onManualTime({ action: "manual", ...draft, elapsedSeconds: duration, reason });
      setDraft(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : t("timeSaveFailed"));
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/50 px-2.5 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <Clock3 className="size-3.5 text-muted-foreground" />
          <span className="truncate">{task.title}</span>
          <Badge variant={task.defaultBillable ? "default" : "outline"} className="text-[0.6rem]">
            {task.defaultBillable ? t("billable") : t("notBillable")}
          </Badge>
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <TimerReset className="size-3" />{formatSeconds(elapsed)}
          {task.billing && task.billing.amountEgp > 0 && (
            <bdi className="font-medium">{formatMoney(task.billing.amountEgp)}</bdi>
          )}
          {task.billing && task.billing.collectedAmountEgp > 0 && (
            <Badge variant="outline" className="text-[0.6rem]">
              {t("collectedFeature")} <bdi>{formatMoney(task.billing.collectedAmountEgp)}</bdi>
            </Badge>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        {!active && collectableAmount > 0 && (
          <Button type="button" size="sm" disabled={busy} onClick={() => onCollect(task)}>
            {t("collectTaskAmount", { amount: formatMoney(collectableAmount) })}
          </Button>
        )}
        {active ? (
          <Button type="button" size="icon-sm" variant="outline" disabled={busy}
            aria-label={t("pauseTimer")} onClick={() => onTimer({ action: "pause", sessionId: active.id })}>
            <Pause className="size-3.5" />
          </Button>
        ) : (
          <Button type="button" size="sm" variant="outline" disabled={busy}
            onClick={() => onTimer(paused ? { action: "resume", sessionId: last.id } : { action: "start" })}>
            <Play className="size-3.5" />{t(paused ? "resumeTimer" : "startTimer")}
          </Button>
        )}
        {(active || paused) && (
          <Button type="button" size="icon-sm" variant="outline" disabled={busy}
            aria-label={t("stopTimer")} onClick={() => onTimer({ action: "stop", sessionId: (active ?? last)?.id })}>
            <Square className="size-3.5" />
          </Button>
        )}
        {!active && !paused && (
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => openManualTime()}>
            <Plus className="size-3.5" />{t("logTime")}
          </Button>
        )}
        {!active && last && last.status !== "running" && (
          <Button type="button" size="icon-sm" variant="ghost" disabled={busy}
            title={t("editTime")} aria-label={t("editTime")} onClick={() => openManualTime(last)}>
            <Pencil className="size-3.5" />
          </Button>
        )}
        {task.status === "completed" && <Check className="ms-1 size-4 text-emerald-600" />}
      </div>
      <Dialog open={Boolean(draft)} onOpenChange={(open) => { if (!open && !busy) setDraft(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t(draft?.sessionId ? "editTimeTitle" : "logTime")}</DialogTitle>
            <DialogDescription>{task.title}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-3 gap-2">
            {["hours", "minutes", "seconds"].map((part, index) => (
              <Label key={part} className="grid gap-1">
                {t(part)}
                <Input type="number" min="0" max={index === 0 ? undefined : 59} step="1"
                  value={parts[index]}
                  onChange={(event) => setParts((values) => values.map((value, i) => i === index ? event.target.value : value))} />
              </Label>
            ))}
          </div>
          <Label className="grid gap-1">
            {t("editTimeReason")}
            <Input value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} placeholder={t("editTimeReasonPh")} />
          </Label>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" onClick={() => void saveManualTime()} disabled={busy || !validDuration}>{t("saveTime")}</Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setDraft(null)}>{t("cancelFeature")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
