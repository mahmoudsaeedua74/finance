"use client";

import { useId, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useTranslations } from "next-intl";
import { QueryErrorAlert } from "@/components/dashboard/query-error-alert";
import { AppSelect } from "@/components/ui/app-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { roundMoney } from "@/lib/currency";
import { formatMoney } from "@/lib/format";
import { loadProjectBilling, selectInvoiceLines, type ProjectInvoiceMode, type ProjectInvoiceScope } from "@/lib/project-billing";
import { printProjectInvoice } from "@/lib/project-document-actions";

type Props = {
  projectId: string;
  initialScope?: ProjectInvoiceScope;
  onClose: () => void;
};

export function ProjectInvoiceDialog({ projectId, initialScope = "project", onClose }: Props) {
  const t = useTranslations("projects");
  const common = useTranslations("common");
  const scopeId = useId();
  const typeId = useId();
  const [scope, setScope] = useState<ProjectInvoiceScope>(initialScope);
  const [mode, setMode] = useState<ProjectInvoiceMode>("outstanding");
  const billing = useQuery({
    queryKey: ["project-invoice", projectId],
    queryFn: () => loadProjectBilling(projectId),
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });

  const scopes: { value: ProjectInvoiceScope; label: string }[] = [
    { value: "project", label: t("invoiceScopeProject") },
    { value: "contract", label: t("invoiceScopeContract") },
    { value: "support", label: t("invoiceScopeSupport") },
  ];
  for (const feature of billing.data?.features ?? []) {
    const value = `feature:${feature.id}` as const;
    if (feature.isArchived && value !== initialScope && !billing.data?.lines.some((line) => line.featureId === feature.id)) continue;
    scopes.push({ value, label: t("invoiceScopeFeature", { title: feature.title }) });
  }
  const modes: { value: ProjectInvoiceMode; label: string }[] = [
    { value: "outstanding", label: t("invoiceOutstanding") },
    { value: "collected", label: t("invoiceCollected") },
  ];
  const scopeLabel = scopes.find((option) => option.value === scope)?.label;
  const lines = selectInvoiceLines(billing.data?.lines ?? [], scope, mode);
  const total = roundMoney(lines.reduce((sum, line) => sum + line.amount, 0));
  const print = useMutation({
    mutationFn: async () => {
      if (!billing.data || !scopeLabel || billing.isFetching || !lines.length) return;
      const { job } = billing.data;
      await printProjectInvoice(job, {
        scope, scopeLabel, mode, lines,
        footerNote: job.currency === "SAR" ? t("invoiceBookCurrency") : undefined,
      });
    },
  });
  const ready = Boolean(scopeLabel && billing.data && !billing.isFetching && !billing.error);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("invoiceDialogTitle")}</DialogTitle>
          <DialogDescription>{billing.data?.job.name || t("invoiceDialogDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor={typeId}>{t("invoiceDocumentType")}</Label>
            <AppSelect
              id={typeId}
              aria-label={t("invoiceDocumentType")}
              value={mode}
              options={modes}
              onValueChange={(value) => { setMode(value as ProjectInvoiceMode); print.reset(); }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={scopeId}>{t("invoiceScope")}</Label>
            <AppSelect
              id={scopeId}
              aria-label={t("invoiceScope")}
              value={scope}
              options={scopes}
              disabled={billing.isFetching}
              onValueChange={(value) => { setScope(value as ProjectInvoiceScope); print.reset(); }}
            />
          </div>
          {billing.isFetching && <p role="status" className="text-sm text-muted-foreground">{common("loading")}</p>}
          {billing.error && <QueryErrorAlert error={billing.error} />}
          {print.error && <QueryErrorAlert error={print.error} />}
          {ready && (lines.length
            ? <div className="flex items-center justify-between gap-2 rounded-lg border p-3" aria-live="polite">
                <span>{t("invoiceDocumentTotal")}</span>
                <strong className="tabular-nums" dir="ltr">{formatMoney(total)}</strong>
              </div>
            : <p role="status" className="text-sm text-muted-foreground">
                {t(mode === "collected" ? "invoiceEmptyCollected" : "invoiceEmptyOutstanding")}
              </p>)}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>{common("close")}</Button>
          <Button type="button" disabled={!ready || !lines.length || print.isPending} onClick={() => print.mutate()}>
            <Printer className="size-4" />
            {t(print.isPending ? "pdfBuilding" : "invoicePrint")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
