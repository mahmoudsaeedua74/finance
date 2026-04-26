"use client";

import { useQuery } from "@tanstack/react-query";
import { jsonFetch } from "@/lib/fetcher";
import { queryKeys } from "@/features/_lib/query-keys";

export type NotificationSummaryPayload = {
  data: {
    unreadCount: number;
    latest: { title: string; body: string; createdAt?: string } | null;
  };
};

export function useNotificationSummary() {
  return useQuery({
    queryKey: queryKeys.notifications.summary(),
    queryFn: () => jsonFetch<NotificationSummaryPayload>("/api/notifications/summary"),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
}
