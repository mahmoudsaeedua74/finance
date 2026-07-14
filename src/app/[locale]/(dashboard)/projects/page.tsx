"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorAlert } from "@/components/dashboard/query-error-alert";
import { WalletAccountPanel } from "@/components/wallet/wallet-account-panel";
import { ProjectJobsFilterBar } from "@/components/projects/project-jobs-filter-bar";
import { ProjectCollectionsBanner } from "@/components/projects/project-collections-banner";
import { ProjectNormalBanner } from "@/components/projects/project-normal-banner";
import {
  ProjectJobsKanbanSkeleton,
  ProjectJobsListSkeleton,
  ProjectJobsTotalsSkeleton,
} from "@/components/projects/project-jobs-list-skeleton";
import { ProjectJobsKanban } from "@/components/projects/project-jobs-kanban";
import { ProjectJobCard } from "@/components/projects/project-job-card";
import { ProjectBulkActionBar } from "@/components/projects/project-bulk-action-bar";
import { ProjectScopeEditor } from "@/components/projects/project-scope-editor";
import { PaginatedListFooter } from "@/components/ui/paginated-list-footer";
import { PaymentMethodField } from "@/components/forms/payment-method-field";
import { ProjectTypeField, projectTypeLabel } from "@/components/forms/project-type-field";
import { ClientField } from "@/components/forms/client-field";
import { type ProjectType } from "@/lib/project-type";
import { WORK_PHASES, type WorkPhase } from "@/lib/project-work-phase";
import type { ProjectTemplateDto } from "@/lib/project-templates-builtin";
import {
  hasActiveProjectJobFilters,
} from "@/lib/project-job-filters";
import { useProjectJobsList } from "@/hooks/use-project-jobs-list";
import { isDetailedProjectType, type ProjectScopeItem } from "@/lib/project-scope";
import {
  canBulkCollect,
  canBulkStatement,
  downloadProposalPdf,
  downloadStatementPdf,
} from "@/lib/project-document-actions";
import { canDeleteProjectJob } from "@/lib/project-job-rules";
import { jsonFetch } from "@/lib/fetcher";
import { formatDateLong, formatMoney } from "@/lib/format";
import { defaultFormDateYmd, toLocalYmd } from "@/lib/ymd";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/lib/payment-method";
import type { ProjectJobDto } from "@/types/project-job";
import type { ClientOption } from "@/lib/services/client-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FolderKanban,
  FileText,
  Loader2,
  Plus,
  Banknote,
  Receipt,
  CheckCircle2,
  Clock,
  Pencil,
  ChevronDown,
} from "lucide-react";
import { mergeMutationToasts } from "@/features/_lib/mutation-toast";
import { useFinanceInvalidation } from "@/hooks/use-finance-invalidation";

function statusBadge(status: ProjectJobDto["status"], t: (k: string) => string) {
  const map = {
    pending: { label: t("statusPending"), variant: "secondary" as const },
    partial: { label: t("statusPartial"), variant: "outline" as const },
    collected: { label: t("statusCollected"), variant: "default" as const },
    cancelled: { label: t("statusCancelled"), variant: "destructive" as const },
  };
  const s = map[status] ?? map.pending;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function workPhaseBadge(phase: WorkPhase, t: (k: string) => string) {
  const map = {
    quote: { label: t("workPhase_quote"), variant: "outline" as const },
    in_progress: { label: t("workPhase_in_progress"), variant: "secondary" as const },
    delivered: { label: t("workPhase_delivered"), variant: "default" as const },
  };
  const s = map[phase] ?? map.in_progress;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function newClientPhonePayload(
  name: string,
  phone: string,
  clients: ClientOption[]
): string | undefined {
  const trimmed = name.trim();
  const p = phone.trim();
  if (!trimmed || !p) return undefined;
  if (clients.some((c) => c.clientName === trimmed)) return undefined;
  return p;
}

export default function ProjectsPage() {
  const t = useTranslations("projects");
  const tC = useTranslations("common");
  const tW = useTranslations("wallet");
  const locale = useLocale();
  const qc = useQueryClient();
  const { invalidateProjects, invalidateExpenses } = useFinanceInvalidation();

  const {
    filters,
    jobs,
    meta,
    totals,
    setCollected,
    setProjectType: setFilterProjectType,
    setSort,
    setClient,
    setWorkPhase: setFilterWorkPhase,
    setSearch,
    setArchive,
    setView,
    clearFilters,
    isListLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useProjectJobsList();

  const listMeta = meta ?? { total: jobs.length, shown: jobs.length, loaded: jobs.length };

  const { data: clientOptionsData } = useQuery({
    queryKey: ["client-options"],
    queryFn: () => jsonFetch<{ data: ClientOption[] }>("/api/clients?options=1"),
    staleTime: 60_000,
  });
  const clientOptions = clientOptionsData?.data ?? [];
  const clientNames = useMemo(
    () => clientOptions.map((c) => c.clientName),
    [clientOptions]
  );

  const { data: templatesData } = useQuery({
    queryKey: ["project-templates"],
    queryFn: () => jsonFetch<{ data: ProjectTemplateDto[] }>("/api/project-templates"),
    staleTime: 120_000,
  });
  const templates = templatesData?.data ?? [];

  const viewMode = filters.view ?? "list";

  const [addOpen, setAddOpen] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [editJob, setEditJob] = useState<ProjectJobDto | null>(null);
  const [detailJob, setDetailJob] = useState<ProjectJobDto | null>(null);
  const [collectJob, setCollectJob] = useState<ProjectJobDto | null>(null);
  const [collectPayoutId, setCollectPayoutId] = useState<string | undefined>();
  const [installmentJob, setInstallmentJob] = useState<ProjectJobDto | null>(null);
  const [instAmount, setInstAmount] = useState("");
  const [instDue, setInstDue] = useState(() => defaultFormDateYmd());
  const [instNote, setInstNote] = useState("");
  const [installmentRows, setInstallmentRows] = useState<
    { amount: string; dueDate: string; note: string }[]
  >([]);
  const [costJob, setCostJob] = useState<ProjectJobDto | null>(null);

  const [name, setName] = useState("");
  const [agreedAmount, setAgreedAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState(() => defaultFormDateYmd());
  const [expectedDate, setExpectedDate] = useState("");
  const [isCollected, setIsCollected] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [projectType, setProjectType] = useState<ProjectType>("normal");
  const [workPhase, setWorkPhase] = useState<WorkPhase>("quote");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [createScopeItems, setCreateScopeItems] = useState<ProjectScopeItem[]>([]);

  const [editName, setEditName] = useState("");
  const [editClientName, setEditClientName] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editExpectedDate, setEditExpectedDate] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>("cash");
  const [editProjectType, setEditProjectType] = useState<ProjectType>("normal");
  const [editWorkPhase, setEditWorkPhase] = useState<WorkPhase>("in_progress");

  const [collectAmount, setCollectAmount] = useState("");
  const [collectDate, setCollectDate] = useState(() => defaultFormDateYmd());
  const [collectMethod, setCollectMethod] = useState<PaymentMethod>("cash");

  const [costTitle, setCostTitle] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [costMethod, setCostMethod] = useState<PaymentMethod>("unspecified");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkCollectOpen, setBulkCollectOpen] = useState(false);
  const [bulkCollectDate, setBulkCollectDate] = useState(() => defaultFormDateYmd());
  const [bulkCollectMethod, setBulkCollectMethod] = useState<PaymentMethod>("cash");
  const [detailScopeItems, setDetailScopeItems] = useState<ProjectScopeItem[]>([]);
  const [detailClientName, setDetailClientName] = useState("");
  const [detailClientPhone, setDetailClientPhone] = useState("");
  const [cancelJob, setCancelJob] = useState<ProjectJobDto | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cloneSource, setCloneSource] = useState<ProjectJobDto | null>(null);
  const [cloneName, setCloneName] = useState("");
  const [cloneAmount, setCloneAmount] = useState("");

  const selectedJobs = useMemo(
    () => jobs.filter((j) => selectedIds.has(j.id)),
    [jobs, selectedIds]
  );

  const canCollectSelected = useMemo(() => canBulkCollect(selectedJobs), [selectedJobs]);
  const canStatementSelected = useMemo(() => canBulkStatement(selectedJobs), [selectedJobs]);
  const [pdfBusy, setPdfBusy] = useState(false);

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

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const scopeLabels = useMemo(
    () => ({
      title: t("scopeTitle"),
      itemTitle: t("scopeItemTitle"),
      description: t("scopeItemDesc"),
      amount: t("scopeItemAmount"),
      tech: t("scopeItemTech"),
      complexity: t("scopeItemComplexity"),
      add: t("scopeAddItem"),
      complexityLow: t("scopeComplexity_low"),
      complexityMid: t("scopeComplexity_mid"),
      complexityHigh: t("scopeComplexity_high"),
    }),
    [t]
  );

  const resetAddForm = useCallback(() => {
    setName("");
    setAgreedAmount("");
    setNotes("");
    setStartDate(defaultFormDateYmd());
    setExpectedDate("");
    setIsCollected(false);
    setPaymentMethod("cash");
    setProjectType("normal");
    setWorkPhase("quote");
    setClientName("");
    setClientPhone("");
    setCreateScopeItems([]);
    setInstallmentRows([]);
    setShowMoreOptions(false);
  }, []);

  const openEdit = useCallback((job: ProjectJobDto) => {
    setEditJob(job);
    setEditName(job.name);
    setEditAmount(String(job.agreedAmount));
    setEditNotes(job.notes ?? "");
    setEditStartDate(toLocalYmd(new Date(job.startDate)));
    setEditExpectedDate(job.expectedPaymentDate ? toLocalYmd(new Date(job.expectedPaymentDate)) : "");
    setEditPaymentMethod(job.expectedPaymentMethod === "card" ? "card" : "cash");
    setEditProjectType(job.projectType ?? "normal");
    setEditWorkPhase(job.workPhase ?? "in_progress");
    setEditClientName(job.clientName ?? "");
    setEditClientPhone("");
  }, []);

  const openDetail = useCallback((job: ProjectJobDto) => {
    setDetailJob(job);
    setDetailScopeItems(job.scopeItems ?? []);
    setDetailClientName(job.clientName ?? "");
    setDetailClientPhone("");
  }, []);

  const createJob = useMutation({
    mutationFn: () =>
      jsonFetch("/api/project-jobs", {
        method: "POST",
        body: JSON.stringify({
          name,
          agreedAmount: Number(agreedAmount),
          notes,
          startDate: new Date(startDate).toISOString(),
          expectedPaymentDate: expectedDate ? new Date(expectedDate).toISOString() : null,
          isCollected,
          paymentMethod,
          projectType,
          workPhase,
          clientName,
          clientPhone: newClientPhonePayload(clientName, clientPhone, clientOptions),
          scopeItems: isDetailedProjectType(projectType) ? createScopeItems : [],
          installments:
            !isCollected && installmentRows.length
              ? installmentRows
                  .filter((r) => r.amount && Number(r.amount) > 0)
                  .map((r) => ({
                    amount: Number(r.amount),
                    dueDate: new Date(r.dueDate || startDate).toISOString(),
                    note: r.note,
                  }))
              : undefined,
        }),
      }),
    ...mergeMutationToasts(
      { loading: tC("saving"), success: t("jobCreated") },
      {
        onSuccess: () => {
          setAddOpen(false);
          resetAddForm();
          invalidateProjects();
          invalidateExpenses();
          void qc.invalidateQueries({ queryKey: ["client-options"] });
          void qc.invalidateQueries({ queryKey: ["clients"] });
        },
      }
    ),
  });

  const updateJob = useMutation({
    mutationFn: () => {
      if (!editJob) return Promise.reject(new Error("No job"));
      return jsonFetch(`/api/project-jobs/${editJob.id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          agreedAmount: Number(editAmount),
          notes: editNotes,
          startDate: new Date(editStartDate).toISOString(),
          expectedPaymentDate: editExpectedDate ? new Date(editExpectedDate).toISOString() : null,
          paymentMethod: editPaymentMethod,
          projectType: editProjectType,
          workPhase: editWorkPhase,
          clientName: editClientName,
          clientPhone: newClientPhonePayload(editClientName, editClientPhone, clientOptions),
        }),
      });
    },
    ...mergeMutationToasts(
      { loading: tC("savingChanges"), success: t("jobUpdated") },
      {
        onSuccess: () => {
          setEditJob(null);
          invalidateProjects();
          void qc.invalidateQueries({ queryKey: ["client-options"] });
          void qc.invalidateQueries({ queryKey: ["clients"] });
        },
      }
    ),
  });

  const collectMutation = useMutation({
    mutationFn: ({ job, payoutId }: { job: ProjectJobDto; payoutId?: string }) =>
      jsonFetch(`/api/project-jobs/${job.id}`, {
        method: "POST",
        body: JSON.stringify({
          action: "collect",
          payoutId,
          amount: payoutId ? undefined : Number(collectAmount) || job.pendingAmount,
          date: new Date(collectDate).toISOString(),
          paymentMethod: collectMethod,
        }),
      }),
    ...mergeMutationToasts(
      { loading: t("loadingCollect"), success: t("collectedOk") },
      {
        onSuccess: () => {
          setCollectJob(null);
          setCollectPayoutId(undefined);
          invalidateProjects();
        },
      }
    ),
  });

  const addInstallmentMutation = useMutation({
    mutationFn: (job: ProjectJobDto) =>
      jsonFetch(`/api/project-jobs/${job.id}`, {
        method: "POST",
        body: JSON.stringify({
          action: "add_installment",
          amount: Number(instAmount),
          dueDate: new Date(instDue).toISOString(),
          note: instNote,
        }),
      }),
    ...mergeMutationToasts(
      { loading: tC("saving"), success: t("installmentAdded") },
      {
        onSuccess: () => {
          setInstallmentJob(null);
          setInstAmount("");
          setInstNote("");
          invalidateProjects();
        },
      }
    ),
  });

  const addCostMutation = useMutation({
    mutationFn: (job: ProjectJobDto) =>
      jsonFetch(`/api/project-jobs/${job.id}`, {
        method: "POST",
        body: JSON.stringify({
          action: "add_cost",
          title: costTitle,
          amount: Number(costAmount),
          paymentMethod: costMethod,
          date: new Date().toISOString(),
        }),
      }),
    ...mergeMutationToasts(
      { loading: tC("saving"), success: t("costAdded") },
      {
        onSuccess: () => {
          setCostTitle("");
          setCostAmount("");
          setCostJob(null);
          invalidateProjects();
          invalidateExpenses();
        },
      }
    ),
  });

  const saveScope = useMutation({
    mutationFn: () => {
      if (!detailJob) return Promise.reject(new Error("No job"));
      return jsonFetch(`/api/project-jobs/${detailJob.id}`, {
        method: "PUT",
        body: JSON.stringify({
          clientName: detailClientName,
          clientPhone: newClientPhonePayload(detailClientName, detailClientPhone, clientOptions),
          scopeItems: detailScopeItems.filter((i) => i.title.trim()),
        }),
      });
    },
    ...mergeMutationToasts(
      { loading: tC("savingChanges"), success: t("scopeSaved") },
      {
        onSuccess: () => {
          invalidateProjects();
          void qc.invalidateQueries({ queryKey: ["client-options"] });
          void qc.invalidateQueries({ queryKey: ["clients"] });
        },
      }
    ),
  });

  const bulkCollect = useMutation({
    mutationFn: () =>
      jsonFetch<{ data: { okCount: number; failed: number } }>("/api/project-jobs/bulk-collect", {
        method: "POST",
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          date: new Date(bulkCollectDate).toISOString(),
          paymentMethod: bulkCollectMethod,
        }),
      }),
    onMutate: () => ({ toastId: toast.loading(t("loadingBulkCollect")) }),
    onSuccess: (res, _v, ctx) => {
      const msg = t("bulkCollectOk", { ok: res.data.okCount, failed: res.data.failed });
      if (ctx?.toastId != null) toast.success(msg, { id: ctx.toastId });
      else toast.success(msg);
      setBulkCollectOpen(false);
      setSelectedIds(new Set());
      invalidateProjects();
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.toastId != null) toast.error(e.message, { id: ctx.toastId });
      else toast.error(e.message);
    },
  });

  const deleteJob = useMutation({
    mutationFn: (id: string) => jsonFetch(`/api/project-jobs/${id}`, { method: "DELETE" }),
    ...mergeMutationToasts(
      { loading: t("loadingDelete"), success: t("jobRemoved") },
      {
        onSuccess: () => {
          setDetailJob(null);
          setEditJob(null);
          invalidateProjects();
        },
      }
    ),
  });

  const cancelJobMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      jsonFetch(`/api/project-jobs/${id}`, {
        method: "POST",
        body: JSON.stringify({ action: "cancel", cancellationReason: reason }),
      }),
    ...mergeMutationToasts(
      { loading: t("loadingCancel"), success: t("jobCancelled") },
      {
        onSuccess: () => {
          setCancelJob(null);
          setCancelReason("");
          setDetailJob(null);
          invalidateProjects();
        },
      }
    ),
  });

  const cloneMutation = useMutation({
    mutationFn: ({ id, name, agreedAmount }: { id: string; name: string; agreedAmount: number }) =>
      jsonFetch(`/api/project-jobs/${id}`, {
        method: "POST",
        body: JSON.stringify({ action: "clone", name, agreedAmount }),
      }),
    ...mergeMutationToasts(
      { loading: t("loadingClone"), success: t("clonedOk") },
      {
        onSuccess: () => {
          setCloneSource(null);
          invalidateProjects();
        },
      }
    ),
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, archive }: { id: string; archive: boolean }) =>
      jsonFetch(`/api/project-jobs/${id}`, {
        method: "POST",
        body: JSON.stringify({ action: archive ? "archive" : "unarchive" }),
      }),
    ...mergeMutationToasts(
      { loading: t("loadingArchive"), success: t("archivedOk") },
      { onSuccess: () => invalidateProjects() }
    ),
  });

  const saveTemplateMutation = useMutation({
    mutationFn: () =>
      jsonFetch("/api/project-templates", {
        method: "POST",
        body: JSON.stringify({
          name: `${projectTypeLabel(projectType, t)} ${new Date().toLocaleDateString(locale)}`,
          projectType,
          expectedPaymentMethod: paymentMethod,
          workPhase,
          notes,
          scopeItems: createScopeItems,
        }),
      }),
    ...mergeMutationToasts(
      { loading: tC("saving"), success: t("templateSaved") },
      { onSuccess: () => {} }
    ),
  });

  const hasActiveFilters = hasActiveProjectJobFilters(filters);

  const applyTemplate = useCallback((tpl: ProjectTemplateDto) => {
    setProjectType(tpl.projectType);
    setPaymentMethod(tpl.expectedPaymentMethod === "card" ? "card" : "cash");
    setWorkPhase(tpl.workPhase);
    setNotes(tpl.notes);
    setCreateScopeItems(tpl.scopeItems ?? []);
  }, []);

  const startClone = useCallback((job: ProjectJobDto) => {
    setCloneSource(job);
    setCloneName(`${job.name} (2)`);
    setCloneAmount(String(job.agreedAmount));
  }, []);

  const handleArchive = useCallback(
    (job: ProjectJobDto) => {
      if (window.confirm(t("archiveConfirm"))) {
        archiveMutation.mutate({ id: job.id, archive: !job.isArchived });
      }
    },
    [archiveMutation, t]
  );

  const handleDelete = useCallback(
    (job: ProjectJobDto) => {
      if (!canDeleteProjectJob(job)) {
        toast.error(t("deleteJobBlocked"));
        return;
      }
      if (window.confirm(t("deleteJobQ"))) {
        deleteJob.mutate(job.id);
      }
    },
    [deleteJob, t]
  );

  const handlePdfClient = useCallback(
    (job: ProjectJobDto) => {
      void runPdfDownload(() => downloadProposalPdf(job, "client", locale, t));
    },
    [runPdfDownload, locale, t]
  );

  const handlePdfInternal = useCallback(
    (job: ProjectJobDto) => {
      void runPdfDownload(() => downloadProposalPdf(job, "internal", locale, t));
    },
    [runPdfDownload, locale, t]
  );

  const openDetailById = useCallback(
    (id: string) => {
      const job = jobs.find((j) => j.id === id);
      if (job) openDetail(job);
    },
    [jobs, openDetail]
  );

  const openCollect = useCallback(
    (job: ProjectJobDto, payout?: ProjectJobDto["payouts"][number]) => {
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
      setCollectJob(job);
    },
    []
  );

  const jobCardHandlers = {
    onToggleSelected: toggleSelected,
    onOpenDetail: openDetail,
    onCollect: openCollect,
    onClone: startClone,
    onEdit: openEdit,
    onArchive: handleArchive,
    onDelete: handleDelete,
    onPdfClient: handlePdfClient,
    onPdfInternal: handlePdfInternal,
  };

  return (
    <div className="store-section w-full space-y-4">
      <PageHeader
        title={t("title")}
        description={t("descFreelance")}
        icon={<FolderKanban className="size-5" />}
        action={
          <Button type="button" className="h-11" onClick={() => { resetAddForm(); setAddOpen(true); }}>
            <Plus className="me-2 size-4" />
            {t("addJob")}
          </Button>
        }
      />

      {error && <QueryErrorAlert error={error} />}

      <WalletAccountPanel variant="compact" />

      <ProjectCollectionsBanner onOpenJob={openDetailById} />

      <ProjectNormalBanner onOpenJob={openDetailById} />

      <ProjectJobsFilterBar
        filters={filters}
        clientNames={clientNames}
        onCollectedChange={setCollected}
        onTypeChange={setFilterProjectType}
        onSortChange={setSort}
        onClientChange={setClient}
        onWorkPhaseChange={setFilterWorkPhase}
        onSearchChange={setSearch}
        onArchiveChange={setArchive}
        onViewChange={setView}
        onClearFilters={clearFilters}
        shown={jobs.length}
        total={listMeta.total}
        loading={isListLoading}
      />

      <ProjectBulkActionBar
        count={selectedIds.size}
        onClear={() => setSelectedIds(new Set())}
        onCollect={() => setBulkCollectOpen(true)}
        onStatementPdfClient={() => {
          void runPdfDownload(() => downloadStatementPdf(selectedJobs, locale, t, "client"));
        }}
        onStatementPdfInternal={() => {
          void runPdfDownload(() => downloadStatementPdf(selectedJobs, locale, t, "internal"));
        }}
        isCollecting={bulkCollect.isPending}
        canCollect={canCollectSelected}
        canStatement={canStatementSelected}
        pdfBusy={pdfBusy}
        labels={{
          selected: t("bulkSelected"),
          clear: t("bulkClear"),
          collectAll: t("bulkCollect"),
          pdfMenu: t("bulkPdfMenu"),
          pdfClient: t("pdfForClient"),
          pdfInternal: t("pdfWithDetails"),
        }}
      />

      {isListLoading ? (
        <ProjectJobsTotalsSkeleton />
      ) : (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px]">{t("totalAgreed")}</CardDescription>
            <CardTitle className="font-mono text-base tabular-nums sm:text-lg">{formatMoney(totals.agreed)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px]">{t("totalCollected")}</CardDescription>
            <CardTitle className="font-mono text-base tabular-nums text-emerald-600 dark:text-emerald-400 sm:text-lg">
              {formatMoney(totals.collected)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px]">{t("totalPending")}</CardDescription>
            <CardTitle className="font-mono text-base tabular-nums text-amber-600 dark:text-amber-400 sm:text-lg">
              {formatMoney(totals.pending)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px]">{t("plSpent")}</CardDescription>
            <CardTitle className="font-mono text-base tabular-nums sm:text-lg">{formatMoney(totals.spent)}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="col-span-2 border-border/70 shadow-sm sm:col-span-1">
          <CardHeader className="p-3 pb-1">
            <CardDescription className="text-[11px]">{t("plNet")}</CardDescription>
            <CardTitle className={cn("font-mono text-base tabular-nums sm:text-lg", totals.net >= 0 ? "" : "text-destructive")}>
              {formatMoney(totals.net)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      )}

      {isListLoading ? (
        viewMode === "kanban" ? <ProjectJobsKanbanSkeleton /> : <ProjectJobsListSkeleton />
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {hasActiveFilters ? t("noJobsFiltered") : t("noJobs")}
          </CardContent>
        </Card>
      ) : viewMode === "kanban" ? (
        <ProjectJobsKanban
          jobs={jobs}
          selectedIds={selectedIds}
          {...jobCardHandlers}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <ProjectJobCard
              key={job.id}
              job={job}
              selected={selectedIds.has(job.id)}
              {...jobCardHandlers}
            />
          ))}
          <PaginatedListFooter
            hasNextPage={!!hasNextPage}
            isFetchingNextPage={isFetchingNextPage}
            onLoadMore={() => void fetchNextPage()}
            labelLoadMore={tC("loadMore")}
            labelLoading={tC("loadingMore")}
            labelEnd={tC("endOfList")}
          />
        </div>
      )}

      {/* Create job — type + essentials first, rest optional */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader className="text-start">
            <DialogTitle>{t("addJob")}</DialogTitle>
            <DialogDescription className="text-start leading-relaxed">
              {t("addJobDescShort")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <ProjectTypeField
              id="job-type"
              value={projectType}
              onChange={(v) => {
                setProjectType(v);
                if (v === "normal") setCreateScopeItems([]);
              }}
            />
            {templates.length > 0 && projectType !== "normal" && (
              <div className="space-y-2">
                <Label htmlFor="job-template">{t("templatePick")}</Label>
                <select
                  id="job-template"
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                  defaultValue=""
                  onChange={(e) => {
                    const tpl = templates.find((x) => x.id === e.target.value);
                    if (tpl) applyTemplate(tpl);
                  }}
                >
                  <option value="">{t("templateNone")}</option>
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name}{tpl.isBuiltin ? "" : " ★"}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="job-name">{t("projName")}</Label>
              <Input
                id="job-name"
                className="h-11 text-base"
                placeholder={t("projNamePh")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="job-amount">{t("agreedAmount")}</Label>
              <Input
                id="job-amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="h-11 text-base font-mono tabular-nums"
                placeholder={t("agreedAmountPh")}
                value={agreedAmount}
                onChange={(e) => setAgreedAmount(e.target.value)}
              />
            </div>
            <ClientField
              id="job-client"
              value={clientName}
              onChange={setClientName}
              clients={clientOptions}
              newClientPhone={clientPhone}
              onNewClientPhoneChange={setClientPhone}
            />
            <PaymentMethodField
              id="job-pay-method"
              value={paymentMethod}
              onChange={setPaymentMethod}
              optional={false}
              size="compact"
            />

            {isDetailedProjectType(projectType) && (
              <ProjectScopeEditor
                items={createScopeItems}
                onChange={setCreateScopeItems}
                labels={scopeLabels}
              />
            )}

            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-border/70 bg-muted/10 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/20 hover:text-foreground"
              onClick={() => setShowMoreOptions((v) => !v)}
              aria-expanded={showMoreOptions}
            >
              <span>{t("optionalDetails")}</span>
              <ChevronDown
                className={cn("size-4 shrink-0 transition-transform", showMoreOptions && "rotate-180")}
              />
            </button>

            {showMoreOptions && (
              <div className="space-y-3 rounded-xl border border-border/60 bg-muted/5 p-3">
                <div className="space-y-2">
                  <Label htmlFor="job-phase">{t("workPhase")}</Label>
                  <select
                    id="job-phase"
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={workPhase}
                    onChange={(e) => setWorkPhase(e.target.value as WorkPhase)}
                  >
                    {WORK_PHASES.map((p) => (
                      <option key={p} value={p}>
                        {t(`workPhase_${p}`)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="rounded-lg border border-border/50 p-3 space-y-2">
                  <label className="flex cursor-pointer items-start gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-primary"
                      checked={isCollected}
                      onChange={(e) => setIsCollected(e.target.checked)}
                    />
                    <span>
                      <span className="font-medium">{t("collectedNow")}</span>
                      {!isCollected && (
                        <span className="mt-1 block text-xs text-muted-foreground leading-snug">
                          {t("pendingHint")}
                        </span>
                      )}
                    </span>
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="job-start">{t("startDate")}</Label>
                    <Input
                      id="job-start"
                      type="date"
                      className="h-11"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="job-due">{t("expectedDate")}</Label>
                    <Input
                      id="job-due"
                      type="date"
                      className="h-11"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-notes">{t("lineNote")}</Label>
                  <Textarea
                    id="job-notes"
                    rows={2}
                    placeholder={t("lineNotePh")}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{t("costLaterHint")}</p>
                {!isCollected && (
                  <div className="space-y-2 rounded-lg border border-dashed border-border/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-sm">{t("installmentsPlan")}</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() =>
                          setInstallmentRows((rows) => [
                            ...rows,
                            { amount: "", dueDate: defaultFormDateYmd(), note: "" },
                          ])
                        }
                      >
                        <Plus className="me-1 size-3.5" />
                        {t("addInstallmentLine")}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{t("installmentsPlanHint")}</p>
                    {installmentRows.map((row, idx) => (
                      <div key={idx} className="grid gap-2 sm:grid-cols-3">
                        <Input
                          type="number"
                          placeholder={t("installmentAmountPh")}
                          className="h-10"
                          value={row.amount}
                          onChange={(e) =>
                            setInstallmentRows((rows) =>
                              rows.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r))
                            )
                          }
                        />
                        <Input
                          type="date"
                          className="h-10"
                          value={row.dueDate}
                          onChange={(e) =>
                            setInstallmentRows((rows) =>
                              rows.map((r, i) => (i === idx ? { ...r, dueDate: e.target.value } : r))
                            )
                          }
                        />
                        <Input
                          placeholder={t("installmentNotePh")}
                          className="h-10"
                          value={row.note}
                          onChange={(e) =>
                            setInstallmentRows((rows) =>
                              rows.map((r, i) => (i === idx ? { ...r, note: e.target.value } : r))
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
              {tC("close")}
            </Button>
            <Button
              type="button"
              className="min-w-[6rem]"
              disabled={!name.trim() || !agreedAmount || Number(agreedAmount) <= 0 || createJob.isPending}
              onClick={() => createJob.mutate(undefined)}
            >
              {createJob.isPending ? <Loader2 className="size-4 animate-spin" /> : t("saveJob")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit job */}
      <Dialog open={!!editJob} onOpenChange={(o) => !o && setEditJob(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader className="text-start">
            <DialogTitle>{t("editJobTitle")}</DialogTitle>
            <DialogDescription className="text-start">{t("editJobDesc")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="edit-name">{t("projName")}</Label>
              <Input id="edit-name" className="h-11" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-amount">{t("agreedAmount")}</Label>
              <Input
                id="edit-amount"
                type="number"
                step="0.01"
                className="h-11"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>
            <ClientField
              id="edit-client"
              value={editClientName}
              onChange={setEditClientName}
              clients={clientOptions}
              newClientPhone={editClientPhone}
              onNewClientPhoneChange={setEditClientPhone}
              size="compact"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-start">{t("startDate")}</Label>
                <Input
                  id="edit-start"
                  type="date"
                  className="h-11"
                  value={editStartDate}
                  onChange={(e) => setEditStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-due">{t("expectedDate")}</Label>
                <Input
                  id="edit-due"
                  type="date"
                  className="h-11"
                  value={editExpectedDate}
                  onChange={(e) => setEditExpectedDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-notes">{t("lineNote")}</Label>
              <Textarea id="edit-notes" rows={2} value={editNotes} onChange={(e) => setEditNotes(e.target.value)} />
            </div>
            <PaymentMethodField
              id="edit-pay-method"
              value={editPaymentMethod}
              onChange={setEditPaymentMethod}
              optional={false}
              size="compact"
            />
            <ProjectTypeField
              id="edit-type"
              value={editProjectType}
              onChange={setEditProjectType}
              compact
            />
            <div className="space-y-2">
              <Label htmlFor="edit-phase">{t("workPhase")}</Label>
              <select
                id="edit-phase"
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={editWorkPhase}
                onChange={(e) => setEditWorkPhase(e.target.value as WorkPhase)}
              >
                {WORK_PHASES.map((p) => (
                  <option key={p} value={p}>
                    {t(`workPhase_${p}`)}
                  </option>
                ))}
              </select>
              {editWorkPhase === "delivered" && editJob?.workPhase !== "delivered" && (
                <p className="text-xs text-muted-foreground">{t("deliveredAutoCollectHint")}</p>
              )}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setEditJob(null)}>{tC("cancel")}</Button>
            <Button
              type="button"
              disabled={!editName.trim() || !editAmount || updateJob.isPending}
              onClick={() => updateJob.mutate(undefined)}
            >
              {updateJob.isPending ? <Loader2 className="size-4 animate-spin" /> : tC("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Collect */}
      <Dialog open={!!collectJob} onOpenChange={(o) => { if (!o) { setCollectJob(null); setCollectPayoutId(undefined); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{collectPayoutId ? t("collectInstallmentTitle") : t("collectTitle")}</DialogTitle>
            <DialogDescription>{collectJob?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {!collectPayoutId && (
              <div className="space-y-2">
                <Label>{tC("amount")}</Label>
                <Input type="number" step="0.01" className="h-11" value={collectAmount} onChange={(e) => setCollectAmount(e.target.value)} />
                <p className="text-xs text-muted-foreground">
                  {t("collectPartialHint", { remaining: formatMoney(collectJob?.pendingAmount ?? 0) })}
                </p>
              </div>
            )}
            {collectPayoutId && collectJob && (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-3 py-2">
                <p className="text-xs text-muted-foreground">{t("installmentAmount")}</p>
                <p className="font-mono text-lg font-bold tabular-nums">{formatMoney(Number(collectAmount))}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>{tC("date")}</Label>
              <Input type="date" className="h-11" value={collectDate} onChange={(e) => setCollectDate(e.target.value)} />
            </div>
            <PaymentMethodField value={collectMethod} onChange={setCollectMethod} optional={false} size="compact" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCollectJob(null)}>{tC("cancel")}</Button>
            <Button
              type="button"
              onClick={() => collectJob && collectMutation.mutate({ job: collectJob, payoutId: collectPayoutId })}
              disabled={collectMutation.isPending}
            >
              {t("collectBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add installment */}
      <Dialog open={!!installmentJob} onOpenChange={(o) => !o && setInstallmentJob(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addInstallmentTitle")}</DialogTitle>
            <DialogDescription>{installmentJob?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("installmentAmount")}</Label>
              <Input
                type="number"
                step="0.01"
                className="h-11"
                value={instAmount}
                onChange={(e) => setInstAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("installmentDue")}</Label>
              <Input type="date" className="h-11" value={instDue} onChange={(e) => setInstDue(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t("installmentNote")}</Label>
              <Input
                className="h-11"
                placeholder={t("installmentNotePh")}
                value={instNote}
                onChange={(e) => setInstNote(e.target.value)}
              />
            </div>
            {installmentJob && (
              <p className="text-xs text-muted-foreground">
                {t("installmentRemaining", { amount: formatMoney(installmentJob.pendingAmount) })}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setInstallmentJob(null)}>{tC("cancel")}</Button>
            <Button
              type="button"
              disabled={!instAmount || addInstallmentMutation.isPending}
              onClick={() => installmentJob && addInstallmentMutation.mutate(installmentJob)}
            >
              {tC("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add cost */}
      <Dialog open={!!costJob} onOpenChange={(o) => !o && setCostJob(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("addCostBtn")}</DialogTitle>
            <DialogDescription>{costJob?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>{t("costTitle")}</Label>
              <Input className="h-11" value={costTitle} onChange={(e) => setCostTitle(e.target.value)} placeholder={t("costTitlePh")} />
            </div>
            <div className="space-y-2">
              <Label>{tC("amount")}</Label>
              <Input type="number" step="0.01" className="h-11" value={costAmount} onChange={(e) => setCostAmount(e.target.value)} />
            </div>
            <PaymentMethodField value={costMethod} onChange={setCostMethod} size="compact" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCostJob(null)}>{tC("cancel")}</Button>
            <Button
              type="button"
              onClick={() => costJob && addCostMutation.mutate(costJob)}
              disabled={!costTitle.trim() || !costAmount || addCostMutation.isPending}
            >
              {tC("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail */}
      <Dialog open={!!detailJob} onOpenChange={(o) => !o && setDetailJob(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{detailJob?.name}</DialogTitle>
            <DialogDescription>{detailJob?.notes || t("detailsDesc")}</DialogDescription>
          </DialogHeader>
          {detailJob && (
            <div className="space-y-4 text-sm">
              {detailJob.status === "cancelled" && detailJob.cancellationReason && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs">
                  <p className="font-medium text-destructive">{t("cancelledBanner")}</p>
                  <p className="mt-1 text-muted-foreground">{detailJob.cancellationReason}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div><span className="text-muted-foreground">{t("clientName")}: </span>{detailClientName || "—"}</div>
                <div><span className="text-muted-foreground">{t("agreedAmount")}: </span>{formatMoney(detailJob.agreedAmount)}</div>
                <div><span className="text-muted-foreground">{t("netProfit")}: </span>{formatMoney(detailJob.netCollected)}</div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={pdfBusy}
                  onClick={() => {
                    void runPdfDownload(() =>
                      downloadProposalPdf(
                        { ...detailJob, clientName: detailClientName, scopeItems: detailScopeItems },
                        "client",
                        locale,
                        t
                      )
                    );
                  }}
                >
                  <FileText className="me-1.5 size-3.5" />
                  {t("pdfForClient")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pdfBusy}
                  onClick={() => {
                    void runPdfDownload(() =>
                      downloadProposalPdf(
                        { ...detailJob, clientName: detailClientName, scopeItems: detailScopeItems },
                        "internal",
                        locale,
                        t
                      )
                    );
                  }}
                >
                  <FileText className="me-1.5 size-3.5" />
                  {t("pdfWithDetails")}
                </Button>
              </div>

              {isDetailedProjectType(detailJob.projectType) && (
                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/5 p-3">
                  <ClientField
                    id="detail-client"
                    value={detailClientName}
                    onChange={setDetailClientName}
                    clients={clientOptions}
                    newClientPhone={detailClientPhone}
                    onNewClientPhoneChange={setDetailClientPhone}
                    size="compact"
                  />
                  <ProjectScopeEditor
                    items={detailScopeItems}
                    onChange={setDetailScopeItems}
                    labels={scopeLabels}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={saveScope.isPending}
                    onClick={() => saveScope.mutate(undefined)}
                  >
                    {saveScope.isPending ? <Loader2 className="me-1.5 size-3.5 animate-spin" /> : null}
                    {t("scopeSave")}
                  </Button>
                </div>
              )}

              {detailJob.costs.length > 0 && (
                <div>
                  <p className="mb-2 font-medium">{t("costsList")}</p>
                  <ul className="space-y-1">
                    {detailJob.costs.map((c) => (
                      <li key={c.id} className="flex justify-between rounded-md bg-muted/20 px-2 py-1">
                        <span>{c.title}</span>
                        <span className="font-mono tabular-nums">{formatMoney(c.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {detailJob.payouts.length > 0 && (
                <div>
                  <p className="mb-2 font-medium">{t("installmentsList")}</p>
                  <ul className="space-y-2">
                    {detailJob.payouts.map((p) => (
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
                        {!p.isCollected && detailJob.status !== "cancelled" && (
                          <Button
                            type="button"
                            size="sm"
                            className="shrink-0"
                            onClick={() => {
                              setDetailJob(null);
                              openCollect(detailJob, p);
                            }}
                          >
                            {t("collectBtn")}
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {detailJob.status !== "cancelled" && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setDetailJob(null);
                    openEdit(detailJob);
                  }}
                >
                  <Pencil className="me-1.5 size-3.5" />
                  {t("editJob")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setInstallmentJob(detailJob);
                    setInstDue(defaultFormDateYmd());
                    setDetailJob(null);
                  }}
                >
                  <Plus className="me-1.5 size-3.5" />
                  {t("addInstallmentBtn")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setCostJob(detailJob);
                    setDetailJob(null);
                  }}
                >
                  <Receipt className="me-1.5 size-3.5" />
                  {t("addCostBtn")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setCancelJob(detailJob);
                    setCancelReason("");
                    setDetailJob(null);
                  }}
                >
                  {t("cancelJobBtn")}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={!canDeleteProjectJob(detailJob)}
                  onClick={() => handleDelete(detailJob)}
                >
                  {t("deleteJob")}
                </Button>
              </div>
              )}
              <p className="text-xs text-muted-foreground">{t("costOptionalHint")}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Clone project */}
      <Dialog open={!!cloneSource} onOpenChange={(o) => !o && setCloneSource(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("cloneTitle")}</DialogTitle>
            <DialogDescription>{cloneSource?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="clone-name">{t("projName")}</Label>
              <Input id="clone-name" className="h-11" value={cloneName} onChange={(e) => setCloneName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clone-amount">{t("agreedAmount")}</Label>
              <Input
                id="clone-amount"
                type="number"
                className="h-11 font-mono"
                value={cloneAmount}
                onChange={(e) => setCloneAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCloneSource(null)}>{tC("cancel")}</Button>
            <Button
              type="button"
              disabled={!cloneName.trim() || !cloneAmount || cloneMutation.isPending}
              onClick={() =>
                cloneSource &&
                cloneMutation.mutate({
                  id: cloneSource.id,
                  name: cloneName.trim(),
                  agreedAmount: Number(cloneAmount),
                })
              }
            >
              {t("cloneConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel project */}
      <Dialog open={!!cancelJob} onOpenChange={(o) => !o && setCancelJob(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("cancelJobTitle")}</DialogTitle>
            <DialogDescription>{cancelJob?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">{t("cancelReason")}</Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder={t("cancelReasonPh")}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCancelJob(null)}>{tC("cancel")}</Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!cancelReason.trim() || cancelJobMutation.isPending}
              onClick={() =>
                cancelJob && cancelJobMutation.mutate({ id: cancelJob.id, reason: cancelReason.trim() })
              }
            >
              {t("cancelJobConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk collect */}
      <Dialog open={bulkCollectOpen} onOpenChange={setBulkCollectOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("bulkCollectTitle")}</DialogTitle>
            <DialogDescription>{t("bulkCollectDesc", { count: selectedIds.size })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="bulk-collect-date">{tC("date")}</Label>
              <Input
                id="bulk-collect-date"
                type="date"
                className="h-11"
                value={bulkCollectDate}
                onChange={(e) => setBulkCollectDate(e.target.value)}
              />
            </div>
            <PaymentMethodField
              id="bulk-collect-method"
              value={bulkCollectMethod}
              onChange={setBulkCollectMethod}
              optional={false}
              size="compact"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBulkCollectOpen(false)}>
              {tC("cancel")}
            </Button>
            <Button type="button" disabled={bulkCollect.isPending} onClick={() => bulkCollect.mutate()}>
              {bulkCollect.isPending ? <Loader2 className="size-4 animate-spin" /> : t("bulkCollectConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
