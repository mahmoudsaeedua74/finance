"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { jsonFetch } from "@/lib/fetcher";
import { queryKeys } from "@/features/_lib/query-keys";
import { useInfiniteOffsetQuery } from "@/hooks/use-infinite-offset-query";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Bell, CheckCheck, Settings2, Volume2, VolumeX, Mail, Filter } from "lucide-react";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  type NotifRow,
  notifTypeBadgeClass,
  notifTypeLabel,
  notificationRowClassName,
} from "@/lib/notification-ui-styles";
import {
  isNotificationSoundEnabled,
  setNotificationSoundEnabled,
} from "@/lib/notification-sound";
import { useNotificationSummary } from "@/hooks/use-notification-summary";
import { Link } from "@/i18n/navigation";
import { notificationProjectHref } from "@/lib/notification-project-link";

const PAGE = 25;

type FilterMode = "all" | "unread";

function severityDot(severity?: string) {
  if (severity === "warning") return "bg-amber-500";
  if (severity === "success") return "bg-emerald-500";
  if (severity === "critical") return "bg-destructive";
  return "bg-primary";
}

export function NotificationInboxPanel() {
  const t = useTranslations("layout");
  const tS = useTranslations("settings");
  const tC = useTranslations("common");
  const locale = useLocale();
  const qc = useQueryClient();
  const { data: sum } = useNotificationSummary();
  const totalUnread = sum?.data?.unreadCount ?? 0;
  const [sound, setSound] = useState(true);
  const [sysPerm, setSysPerm] = useState<NotificationPermission>("default");
  const [filter, setFilter] = useState<FilterMode>("all");

  const { data: delivery } = useQuery({
    queryKey: ["notification-delivery-status"],
    queryFn: () =>
      jsonFetch<{
        data: { emailConfigured: boolean; noLoginReminderEmail: boolean };
      }>("/api/notification-delivery/status"),
    staleTime: 120_000,
  });

  useEffect(() => {
    setSound(isNotificationSoundEnabled());
    if (typeof window !== "undefined" && "Notification" in window) {
      setSysPerm(Notification.permission);
    }
  }, []);

  const listUrl = useMemo(
    () => (off: number, lim: number) =>
      filter === "unread"
        ? `/api/notifications?unread=1&offset=${off}&limit=${lim}`
        : `/api/notifications?offset=${off}&limit=${lim}`,
    [filter]
  );

  const { flatData, hasNextPage, isFetchingNextPage, fetchNextPage, isLoading } =
    useInfiniteOffsetQuery<NotifRow>({
      queryKey: [...queryKeys.notifications.allInbox(), filter],
      getUrl: listUrl,
      pageSize: PAGE,
    });

  const markRead = useMutation({
    mutationFn: (id: string) =>
      jsonFetch(`/api/notifications/${id}/read`, { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.root() });
    },
  });

  const markAll = useMutation({
    mutationFn: () =>
      jsonFetch("/api/notifications/read-all", { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.notifications.root() });
    },
  });

  const emailConfigured = delivery?.data?.emailConfigured ?? true;
  const loginReminderOn = delivery?.data?.noLoginReminderEmail !== false;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{t("notif.inboxTitle")}</p>
          <p className="text-xs text-muted-foreground">
            {totalUnread > 0
              ? t("notif.unreadCount", { n: totalUnread })
              : t("notif.inboxHelperShort")}
          </p>
        </div>
        <Link
          href="/settings"
          className="inline-flex items-center gap-1 rounded-lg border border-border/70 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <Settings2 className="size-3.5" />
          {tS("titleShort")}
        </Link>
      </div>

      {!emailConfigured && loginReminderOn ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
          <Mail className="size-3.5 shrink-0 mt-0.5 text-amber-600" />
          <span>{t("notif.emailNotConfigured")}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          className="gap-1 h-8"
          onClick={() => setFilter("all")}
        >
          <Filter className="size-3.5" />
          {t("notif.filterAll")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={filter === "unread" ? "default" : "outline"}
          className="gap-1 h-8"
          onClick={() => setFilter("unread")}
        >
          {t("notif.filterUnread")}
          {totalUnread > 0 ? (
            <span className="ms-1 rounded-full bg-primary-foreground/20 px-1.5 text-[0.65rem]">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          ) : null}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="gap-1.5 ms-auto"
          onClick={() => markAll.mutate()}
          disabled={markAll.isPending || totalUnread === 0}
        >
          <CheckCheck className="size-4" />
          {t("notif.markAllRead")}
        </Button>
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {sound ? (
              <Volume2 className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <VolumeX className="size-4 shrink-0 text-muted-foreground" />
            )}
            <Label htmlFor="notif-sound" className="text-xs font-medium cursor-pointer">
              {t("notif.soundOn")}
            </Label>
          </div>
          <input
            id="notif-sound"
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={sound}
            onChange={(e) => {
              setNotificationSoundEnabled(e.target.checked);
              setSound(e.target.checked);
            }}
          />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground flex items-start gap-1.5 min-w-0">
            {t("notif.desktopHelper")}
          </p>
          {typeof window !== "undefined" && "Notification" in window ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={async () => {
                if (!("Notification" in window)) return;
                try {
                  const r = await Notification.requestPermission();
                  setSysPerm(r);
                  if (typeof window !== "undefined") {
                    localStorage.setItem("notif-permission-asked", "1");
                  }
                } catch {
                  // ignore
                }
              }}
            >
              {sysPerm === "granted" ? t("notif.browserGranted") : t("notif.enableBrowser")}
            </Button>
          ) : null}
        </div>
      </div>

      <ScrollArea className="h-[min(60vh,28rem)] pr-1">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{tC("loading")}</p>
        ) : flatData.length === 0 ? (
          <div className="py-8 text-center space-y-2">
            <Bell className="size-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">{t("notif.empty")}</p>
            {filter === "unread" ? (
              <p className="text-xs text-muted-foreground">{t("notif.emptyUnread")}</p>
            ) : null}
          </div>
        ) : (
          <ul className="space-y-2 pb-2">
            {flatData.map((r) => {
              const projectHref = notificationProjectHref(r);
              const inner = (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {r.readAt == null ? (
                        <span
                          className={cn("inline-block size-2 rounded-full shrink-0", severityDot(r.severity))}
                          aria-hidden
                        />
                      ) : null}
                      {r.type ? (
                        <span
                          className={cn(
                            "inline-block max-w-full truncate rounded border px-1.5 py-0.5 text-[0.65rem] font-medium",
                            notifTypeBadgeClass(r.type)
                          )}
                        >
                          {notifTypeLabel(r.type, t)}
                        </span>
                      ) : null}
                    </div>
                    <p className="text-sm font-semibold leading-tight break-words">{r.title}</p>
                    <p className="text-xs text-muted-foreground break-words whitespace-pre-wrap">
                      {r.body}
                    </p>
                    {projectHref ? (
                      <p className="text-xs font-medium text-primary">{t("notif.openProject")}</p>
                    ) : null}
                    {r.createdAt ? (
                      <p className="text-[0.65rem] text-muted-foreground" dir="ltr">
                        {formatDateTime(new Date(r.createdAt), locale)}
                      </p>
                    ) : null}
                  </div>
                  {r.readAt == null ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="shrink-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        markRead.mutate(r._id);
                      }}
                    >
                      {t("notif.read")}
                    </Button>
                  ) : null}
                </div>
              );

              return (
              <li
                key={r._id}
                className={cn(
                  "rounded-lg p-2.5 transition-colors",
                  notificationRowClassName(r),
                  r.readAt == null && "ring-1 ring-primary/20",
                  projectHref && "hover:ring-primary/30"
                )}
              >
                {projectHref ? (
                  <Link
                    href={projectHref}
                    className="block"
                    onClick={() => {
                      if (r.readAt == null) markRead.mutate(r._id);
                    }}
                  >
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </li>
            );
            })}
          </ul>
        )}
      </ScrollArea>
      {hasNextPage && (
        <div className="pt-0">
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
    </div>
  );
}

type BellCommonProps = {
  unread: number;
  onOpen: () => void;
  compact?: boolean;
  className?: string;
};

export function NotificationBellButton({
  unread,
  onOpen,
  compact,
  className,
}: BellCommonProps) {
  const t = useTranslations("layout");
  return (
    <Button
      type="button"
      variant="outline"
      size={compact ? "icon" : "sm"}
      className={className}
      onClick={onOpen}
      aria-label={t("notif.openInbox")}
    >
      <span className="relative inline-flex">
        <Bell className="size-5" aria-hidden />
        {unread > 0 ? (
          <span
            className="absolute -end-1.5 -top-1.5 min-w-[1.1rem] rounded-full bg-destructive px-1 text-center text-[0.6rem] font-bold leading-4 text-destructive-foreground"
            aria-label={t("notif.unreadCount", { n: unread })}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </span>
      {!compact ? (
        <span className="ms-2 text-sm font-medium">{t("notif.inbox")}</span>
      ) : null}
    </Button>
  );
}
