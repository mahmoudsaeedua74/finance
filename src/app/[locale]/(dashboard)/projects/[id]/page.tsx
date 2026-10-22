"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  ArrowLeft,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  FolderKanban,
  Loader2,
  Pencil,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorAlert } from "@/components/dashboard/query-error-alert";
import { Link } from "@/i18n/navigation";
import { buttonVariants, Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { jsonFetch } from "@/lib/fetcher";
import { playProjectActionSound } from "@/lib/project-action-sound";
import { formatDateLong, formatMoney } from "@/lib/format";
import { defaultFormDateYmd } from "@/lib/ymd";
import type { ProjectJobDto } from "@/types/project-job";
import type { PaymentMethod } from "@/lib/payment-method";
import { PaymentMethodField } from "@/components/forms/payment-method-field";
import { PaymentMethodLabel } from "@/components/forms/payment-method-label";
import { ProjectPeriodReport } from "@/components/projects/project-period-report";
import { downloadProposalPdf } from "@/lib/project-document-actions";
import { mergeMutationToasts } from "@/features/_lib/mutation-toast";
import { useFinanceInvalidation } from "@/hooks/use-finance-invalidation";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useCallback, useState } from "react";
import { ProjectCollectionsBanner } from "@/components/projects/project-collections-banner";
import { ProjectCredentialChips } from "@/components/projects/project-credential-chips";

type Props = { params: { id: string } };

export default function ProjectJobDetailPage({ params }: Props) {
  const t = useTranslations("projects");
  const tC = useTranslations("common");
  const locale = useLocale();
  const qc = useQueryClient();
  const { invalidateProjects } = useFinanceInvalidation();

  const { data, isLoading, error } = useQuery({
    queryKey: ["project-job", params.id],
    queryFn: () => jsonFetch<{ data: ProjectJobDto }>(`/api/project-jobs/${params.id}`),
  });
  const job = data?.data;

  const [collectOpen, setCollectOpen] = useState(false);
  const [collectAmount, setCollectAmount] = useState("");
  const [collectDate, setCollectDate] = useState(() => defaultFormDateYmd());
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>("cash");
  const [collectPayoutId, setCollectPayoutId] = useState<string | undefined>();
  const [pdfBusy, setPdfBusy] = useState(false);
  const [instOpen, setInstOpen] = useState(false);
  const [instAmount, setInstAmount] = useState("");
  const [instDue, setInstDue] = useState(() => defaultFormDateYmd());
  const [instNote, setInstNote] = useState("");

  const openCollect = useCallback(
    (payout?: ProjectJobDto["payouts"][number]) => {
      if (!job) return;
      setCollectPayoutId(payout?.id);
      setCollectAmount(
        String(payout?.amount ?? (job.pendingAmount > 0 ? job.pendingAmount : job.agreedAmount))
      );
      setCollectDate(defaultFormDateYmd());
      setCollectMethod(
        job.expectedPaymentMethod === "card"
          ? "card"
          : job.expectedPaymentMethod === "cash"
            ? "cash"
            : "cash"
      );
      setCollectOpen(true);
    },
    [job]
  );

  const runPdfDownload = useCallback(
    async (task: () => Promise<string>) => {
      if (pdfBusy) return;
      setPdfBusy(true);
      const toastId = toast.loading(t("pdfBuilding"));
      try {
        const filename = await task();
        toast.success(t("pdfDownloadOk", { name: filename }), { id: toastId });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : String(e), { id: toastId });
      } finally {
        setPdfBusy(false);
      }
    },
    [pdfBusy, t]
  );

  const addInstallment = useMutation({
    mutationFn: () => {
      if (!job) return Promise.reject(new Error("No job"));
      return jsonFetch(`/api/project-jobs/${job.id}`, {
        method: "POST",
        body: JSON.stringify({
          action: "add_installment",
          amount: Number(instAmount),
          dueDate: new Date(instDue).toISOString(),
          note: instNote,
        }),
      });
    },
    ...mergeMutationToasts(
      { loading: tC("saving"), success: t("installmentAdded") },
      {
        onSuccess: () => {
          setInstOpen(false);
          setInstAmount("");
          setInstNote("");
          invalidateProjects();
          void qc.invalidateQueries({ queryKey: ["project-job", params.id] });
        },
      }
    ),
  });

  const setRetainer = useMutation({
    mutationFn: (on: boolean) => {
      if (!job) return Promise.reject(new Error("No job"));
      return jsonFetch(`/api/project-jobs/${job.id}`, {
        method: "PUT",
        body: JSON.stringify({ billingMode: on ? "retainer" : "fixed" }),
      });
    },
    ...mergeMutationToasts(
      { loading: tC("saving"), success: t("billingModeSaved") },
      {
        onSuccess: () => {
          invalidateProjects();
          void qc.invalidateQueries({ queryKey: ["project-job", params.id] });
        },
      }
    ),
  });

  const collectMutation = useMutation({
    mutationFn: () => {
      if (!job) return Promise.reject(new Error("No job"));
      return jsonFetch(`/api/project-jobs/${job.id}`, {
        method: "POST",
        body: JSON.stringify({
          action: "collect",
          payoutId: collectPayoutId,
          amount: collectPayoutId ? undefined : Number(collectAmount) || job.pendingAmount,
          date: new Date(collectDate).toISOString(),
          paymentMethod: collectMethod,
        }),
      });
    },
    ...mergeMutationToasts(
      { loading: t("loadingCollect"), success: t("collectedOk") },
      {
        onSuccess: () => {
          playProjectActionSound();
          setCollectOpen(false);
          setCollectPayoutId(undefined);
          invalidateProjects();
          void qc.invalidateQueries({ queryKey: ["project-job", params.id] });
          void qc.invalidateQueries({ queryKey: ["project-attention"] });
        },
      }
    ),
  });

  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-xl bg-muted/25" />;
  }

  if (error || !job) {
    return (
      <div className="space-y-4">
        <Link href="/projects" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}>
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {t("collectionsBack")}
        </Link>
        <QueryErrorAlert error={error ?? new Error("Not found")} />
      </div>
    );
  }

  const collectionPct =
    job.agreedAmount > 0 ? Math.min(100, (job.collectedAmount / job.agreedAmount) * 100) : 0;

  return (
    <div className="store-section w-full space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/projects" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "gap-1.5")}>
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {t("collectionsBack")}
        </Link>
        <Link
          href="/projects/collections"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <CalendarClock className="size-3.5" />
          {t("collectionsPageTitle")}
        </Link>
      </div>

      <PageHeader
        title={job.name}
        description={job.clientName || job.notes || t("detailsDesc")}
        icon={<FolderKanban className="size-5" />}
      />

      <ProjectCollectionsBanner variant="link" />

      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/60 bg-card p-3 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
          checked={job.billingMode === "retainer"}
          disabled={setRetainer.isPending || job.status === "cancelled"}
          onChange={(e) => setRetainer.mutate(e.target.checked)}
        />
        <span>
          <span className="font-medium">{t("billingModeRetainer")}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{t("billingModeHint")}</span>
        </span>
      </label>

      <ProjectPeriodReport payouts={job.payouts} costs={job.costs} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <p className="text-xs text-muted-foreground">{t("agreedAmount")}</p>
          <p className="font-mono text-lg font-bold tabular-nums">{formatMoney(job.agreedAmount)}</p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <p className="text-xs text-muted-foreground">{t("totalCollected")}</p>
          <p className="font-mono text-lg font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatMoney(job.collectedAmount)}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <p className="text-xs text-muted-foreground">{t("pendingAmount")}</p>
          <p className="font-mono text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">
            {formatMoney(job.pendingAmount)}
          </p>
        </div>
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <p className="text-xs text-muted-foreground">{t("netProfit")}</p>
          <p className="font-mono text-lg font-bold tabular-nums">{formatMoney(job.netCollected)}</p>
        </div>
      </div>

      {job.billingMode !== "retainer" && (
      <div className="space-y-1 rounded-xl border border-border/60 bg-muted/10 p-3">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{t("collectionProgress")}</span>
          <span className="font-mono tabular-nums">{Math.round(collectionPct)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${collectionPct}%` }} />
        </div>
      </div>
      )}

      <ProjectCredentialChips email={job.projectEmail} password={job.projectPassword} />

      <div className="flex flex-wrap gap-2">
        {job.status !== "cancelled" && job.pendingAmount > 0.005 && (
          <Button type="button" size="sm" onClick={() => openCollect()}>
            <CheckCircle2 className="me-1.5 size-3.5" />
            {t("collectBtn")}
          </Button>
        )}
        {job.status !== "cancelled" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setInstDue(defaultFormDateYmd());
              setInstOpen(true);
            }}
          >
            <Plus className="me-1.5 size-3.5" />
            {t("addInstallmentBtn")}
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={pdfBusy}
          onClick={() => void runPdfDownload(() => downloadProposalPdf(job, "client", locale, t))}
        >
          <FileText className="me-1.5 size-3.5" />
          {t("pdfForClient")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pdfBusy}
          onClick={() => void runPdfDownload(() => downloadProposalPdf(job, "internal", locale, t))}
        >
          <FileText className="me-1.5 size-3.5" />
          {t("pdfWithDetails")}
        </Button>
        <Link
          href="/projects"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
        >
          <Pencil className="size-3.5" />
          {t("editOnProjectsList")}
        </Link>
      </div>

      {job.payouts.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <p className="mb-2 font-medium text-sm">{t("installmentsList")}</p>
          <ul className="space-y-2">
            {job.payouts.map((p) => (
              <li
                key={p.id}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between",
                  p.isCollected
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : "border-amber-500/25 bg-amber-500/5"
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {p.isCollected ? (
                      <Banknote className="size-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <Clock className="size-3.5 shrink-0 text-amber-600" />
                    )}
                    <span className="font-mono font-semibold tabular-nums">{formatMoney(p.amount)}</span>
                    <PaymentMethodLabel method={p.paymentMethod} />
                    <Badge variant={p.isCollected ? "default" : "secondary"} className="text-[0.65rem]">
                      {p.isCollected ? t("statusCollected") : t("statusPending")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.isCollected ? t("collectedOn") : t("dueOn")}{" "}
                    {formatDateLong(new Date(p.date), locale)}
                    {p.note ? ` · ${p.note}` : ""}
                  </p>
                </div>
                {!p.isCollected && job.status !== "cancelled" && (
                  <Button type="button" size="sm" className="shrink-0" onClick={() => openCollect(p)}>
                    {t("collectBtn")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {job.costs.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card p-3">
          <p className="mb-2 font-medium text-sm">{t("costsList")}</p>
          <ul className="space-y-1">
            {job.costs.map((c) => (
              <li key={c.id} className="flex justify-between rounded-md bg-muted/20 px-2 py-1 text-sm">
                <span>{c.title}</span>
                <span className="flex items-center gap-2">
                  <PaymentMethodLabel method={c.paymentMethod} />
                  <span className="font-mono tabular-nums">{formatMoney(c.amount)}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={collectOpen} onOpenChange={(o) => { if (!o) { setCollectOpen(false); setCollectPayoutId(undefined); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{collectPayoutId ? t("collectInstallmentTitle") : t("collectTitle")}</DialogTitle>
            <DialogDescription>{job.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!collectPayoutId && (
              <div className="space-y-2">
                <Label>{tC("amount")}</Label>
                <Input type="number" step="0.01" className="h-11" value={collectAmount} onChange={(e) => setCollectAmount(e.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label>{tC("date")}</Label>
              <Input type="date" className="h-11" value={collectDate} onChange={(e) => setCollectDate(e.target.value)} />
            </div>
            <PaymentMethodField value={collectMethod} onChange={setCollectMethod} optional={false} size="compact" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCollectOpen(false)}>{tC("cancel")}</Button>
            <Button type="button" disabled={collectMutation.isPending} onClick={() => collectMutation.mutate(undefined)}>
              {collectMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : t("collectBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={instOpen} onOpenChange={setInstOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addInstallmentTitle")}</DialogTitle>
            <DialogDescription>{job.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("installmentAmount")}</Label>
              <Input type="number" step="0.01" className="h-11" value={instAmount} onChange={(e) => setInstAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("installmentDue")}</Label>
              <Input type="date" className="h-11" value={instDue} onChange={(e) => setInstDue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("installmentNote")}</Label>
              <Input className="h-11" placeholder={t("installmentNotePh")} value={instNote} onChange={(e) => setInstNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setInstOpen(false)}>{tC("cancel")}</Button>
            <Button
              type="button"
              disabled={addInstallment.isPending || !Number.isFinite(Number(instAmount)) || Number(instAmount) <= 0}
              onClick={() => addInstallment.mutate(undefined)}
            >
              {addInstallment.isPending ? <Loader2 className="size-4 animate-spin" /> : t("addInstallmentBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
