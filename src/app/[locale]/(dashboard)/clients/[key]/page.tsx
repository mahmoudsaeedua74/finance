"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, FolderKanban, Phone, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorAlert } from "@/components/dashboard/query-error-alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { jsonFetch } from "@/lib/fetcher";
import { formatDateLong, formatMoney } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { buildProjectJobsFilterQueryString, clientFilterFromUrlKey } from "@/lib/project-job-filters";
import type { ClientDetail } from "@/lib/services/client-service";
import { projectTypeLabel } from "@/components/forms/project-type-field";
import { mergeMutationToasts } from "@/features/_lib/mutation-toast";
import { cn } from "@/lib/utils";

type Props = { params: { key: string } };

function workPhaseBadge(phase: string, t: (k: string) => string) {
  const map = {
    quote: { label: t("workPhase_quote"), variant: "outline" as const },
    in_progress: { label: t("workPhase_in_progress"), variant: "secondary" as const },
    delivered: { label: t("workPhase_delivered"), variant: "default" as const },
  };
  const s = map[phase as keyof typeof map] ?? map.in_progress;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function paymentBadge(status: string, t: (k: string) => string) {
  const map = {
    pending: { label: t("statusPending"), variant: "secondary" as const },
    partial: { label: t("statusPartial"), variant: "outline" as const },
    collected: { label: t("statusCollected"), variant: "default" as const },
    cancelled: { label: t("statusCancelled"), variant: "destructive" as const },
  };
  const s = map[status as keyof typeof map] ?? map.pending;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export default function ClientDetailPage({ params }: Props) {
  const t = useTranslations("clients");
  const tP = useTranslations("projects");
  const tC = useTranslations("common");
  const locale = useLocale();
  const qc = useQueryClient();
  const clientName = clientFilterFromUrlKey(params.key);

  const { data, isLoading, error } = useQuery({
    queryKey: ["client-detail", params.key],
    queryFn: () => jsonFetch<{ data: ClientDetail }>(`/api/clients/${params.key}`),
  });

  const detail = data?.data;
  const projectsHref = `/projects${buildProjectJobsFilterQueryString({ client: clientName })}`;

  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (detail?.profile) {
      setPhone(detail.profile.phone);
      setWhatsapp(detail.profile.whatsapp);
      setNotes(detail.profile.notes);
    }
  }, [detail?.profile]);

  const saveProfile = useMutation({
    mutationFn: () =>
      jsonFetch(`/api/clients/${params.key}`, {
        method: "PUT",
        body: JSON.stringify({ phone, whatsapp, notes }),
      }),
    ...mergeMutationToasts(
      { loading: tC("savingChanges"), success: t("profileSaved") },
      {
        onSuccess: () => {
          void qc.invalidateQueries({ queryKey: ["client-detail", params.key] });
        },
      }
    ),
  });

  return (
    <div className="store-section w-full space-y-4">
      <PageHeader
        title={detail?.clientName ?? clientName}
        description={t("detailDesc")}
        icon={<Users className="size-5" />}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/clients" className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "h-9")}>
              <ArrowLeft className="me-1.5 size-4" />
              {t("back")}
            </Link>
            <Link href={projectsHref} className={cn(buttonVariants({ size: "sm" }), "h-9")}>
              <FolderKanban className="me-1.5 size-4" />
              {t("viewProjects")}
            </Link>
          </div>
        }
      />

      {error && <QueryErrorAlert error={error} />}

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-muted/20" />
      ) : !detail ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">{t("notFound")}</CardContent>
        </Card>
      ) : (
        <>
          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="size-4" />
                {t("profileTitle")}
              </CardTitle>
              <CardDescription>{t("profileDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 p-4 pt-0 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client-phone">{t("phone")}</Label>
                <Input id="client-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-wa">{t("whatsapp")}</Label>
                <Input id="client-wa" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="h-10" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="client-notes">{t("profileNotes")}</Label>
                <Textarea id="client-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <Button
                type="button"
                className="sm:col-span-2 sm:w-fit"
                disabled={saveProfile.isPending}
                onClick={() => saveProfile.mutate(undefined)}
              >
                {tC("save")}
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="p-3 pb-1">
                <CardDescription className="text-[11px]">{t("projectCountLabel")}</CardDescription>
                <CardTitle className="text-lg tabular-nums">{detail.projectCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="p-3 pb-1">
                <CardDescription className="text-[11px]">{t("active")}</CardDescription>
                <CardTitle className="text-lg tabular-nums">{detail.activeCount}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="p-3 pb-1">
                <CardDescription className="text-[11px]">{t("pending")}</CardDescription>
                <CardTitle className="text-lg tabular-nums text-amber-600 dark:text-amber-400">
                  {formatMoney(detail.pending)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="p-3 pb-1">
                <CardDescription className="text-[11px]">{t("collected")}</CardDescription>
                <CardTitle className="text-lg tabular-nums text-emerald-600 dark:text-emerald-400">
                  {formatMoney(detail.collected)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("projectsList")}</CardTitle>
              <CardDescription>{t("projectsListHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              {detail.projects.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 rounded-xl border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {projectTypeLabel(p.projectType as never, tP)} ·{" "}
                      {formatDateLong(new Date(p.createdAt), locale)}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {workPhaseBadge(p.workPhase, tP)}
                      {paymentBadge(p.status, tP)}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
                    <span className="font-mono tabular-nums">{formatMoney(p.agreedAmount)}</span>
                    {p.pendingAmount > 0.005 && (
                      <span className="text-amber-600 dark:text-amber-400">
                        {t("pendingShort")}: {formatMoney(p.pendingAmount)}
                      </span>
                    )}
                    <Link
                      href={projectsHref}
                      className={cn(buttonVariants({ size: "sm", variant: "outline" }), "h-8")}
                    >
                      {t("openProject")}
                    </Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
