"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { QueryErrorAlert } from "@/components/dashboard/query-error-alert";
import { AddClientDialog } from "@/components/forms/add-client-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { jsonFetch } from "@/lib/fetcher";
import { formatDateLong, formatMoney } from "@/lib/format";
import { Link } from "@/i18n/navigation";
import { clientUrlKey } from "@/lib/project-job-filters";
import type { ClientSummary } from "@/lib/services/client-service";
import { cn } from "@/lib/utils";

export default function ClientsPage() {
  const t = useTranslations("clients");
  const locale = useLocale();
  const [addOpen, setAddOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["clients"],
    queryFn: () => jsonFetch<{ data: ClientSummary[] }>("/api/clients"),
  });

  const clients = data?.data ?? [];

  return (
    <div className="store-section w-full space-y-4">
      <PageHeader
        title={t("title")}
        description={t("desc")}
        icon={<Users className="size-5" />}
        action={
          <Button type="button" size="sm" className="h-9" onClick={() => setAddOpen(true)}>
            <Plus className="me-1.5 size-4" />
            {t("addClient")}
          </Button>
        }
      />

      <AddClientDialog open={addOpen} onOpenChange={setAddOpen} />

      {error && <QueryErrorAlert error={error} />}

      {isLoading ? (
        <div className="h-48 animate-pulse rounded-xl bg-muted/20" />
      ) : clients.length === 0 ? (
        <Card>
          <CardContent className="space-y-3 py-12 text-center text-sm text-muted-foreground">
            <p>{t("empty")}</p>
            <Button type="button" size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              <Plus className="me-1.5 size-4" />
              {t("addClient")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {clients.map((c) => (
            <Link key={c.clientName} href={`/clients/${clientUrlKey(c.clientName)}`} className="block">
              <Card className="h-full border-border/60 shadow-sm transition-shadow hover:shadow-md">
                <CardHeader className="space-y-1 p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="truncate text-base">{c.clientName}</CardTitle>
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {t("projectCount", { count: c.projectCount })}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {t("lastProject")}: {formatDateLong(new Date(c.lastProjectAt), locale)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-2 p-4 pt-0 text-xs">
                  <div className="rounded-lg bg-muted/30 p-2">
                    <p className="text-[10px] text-muted-foreground">{t("active")}</p>
                    <p className="font-semibold tabular-nums">{c.activeCount}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2">
                    <p className="text-[10px] text-muted-foreground">{t("pending")}</p>
                    <p className={cn("font-semibold tabular-nums", c.pending > 0 && "text-amber-600 dark:text-amber-400")}>
                      {formatMoney(c.pending)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2">
                    <p className="text-[10px] text-muted-foreground">{t("agreed")}</p>
                    <p className="font-mono font-semibold tabular-nums">{formatMoney(c.agreed)}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 p-2">
                    <p className="text-[10px] text-muted-foreground">{t("collected")}</p>
                    <p className="font-mono font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatMoney(c.collected)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
