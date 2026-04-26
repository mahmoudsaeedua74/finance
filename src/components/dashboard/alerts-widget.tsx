"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useInfiniteOffsetQuery } from "@/hooks/use-infinite-offset-query";
import { useTranslations } from "next-intl";
import { jsonFetch } from "@/lib/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Row = {
  _id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  readAt?: string | null;
};

export function AlertsWidget() {
  const t = useTranslations("dashboard");
  const tC = useTranslations("common");
  const qc = useQueryClient();
  const {
    flatData: notifRows,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteOffsetQuery<Row>({
    queryKey: ["notifications", "unread"],
    getUrl: (off, lim) =>
      `/api/notifications?unread=1&offset=${off}&limit=${lim}`,
  });
  const markRead = useMutation({
    mutationFn: (id: string) => jsonFetch(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const rows = notifRows;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("alertsTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noAlerts")}</p>
        ) : (
          <>
            {rows.map((r) => (
            <div key={r._id} className="rounded-lg border p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.body}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => markRead.mutate(r._id)}>
                  {t("markRead")}
                </Button>
              </div>
            </div>
            ))}
            {hasNextPage && (
              <div className="pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="w-full"
                  disabled={isFetchingNextPage}
                  onClick={() => void fetchNextPage()}
                >
                  {isFetchingNextPage ? tC("loadingMore") : tC("loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
