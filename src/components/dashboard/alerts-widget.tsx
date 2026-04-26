"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications", "unread"],
    queryFn: () => jsonFetch<{ data: Row[] }>("/api/notifications?unread=1"),
  });
  const markRead = useMutation({
    mutationFn: (id: string) => jsonFetch(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const rows = data?.data ?? [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Alerts</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No alerts.</p>
        ) : (
          rows.slice(0, 5).map((r) => (
            <div key={r._id} className="rounded-lg border p-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.body}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => markRead.mutate(r._id)}>
                  Mark read
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
