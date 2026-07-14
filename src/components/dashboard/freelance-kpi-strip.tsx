"use client";

import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { motion } from "framer-motion";
import { Briefcase, Clock, Users, Wallet, AlertTriangle, CalendarClock } from "lucide-react";
import { useMonth } from "@/context/month-context";
import { jsonFetch } from "@/lib/fetcher";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import type { FreelanceKpis } from "@/lib/services/freelance-kpi-service";
import { cn } from "@/lib/utils";

const cardMotion = { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 } };

function KpiCard({
  title,
  value,
  hint,
  icon,
  href,
  tone,
  delay,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  href?: string;
  tone?: "default" | "warning" | "success";
  delay: number;
}) {
  const inner = (
    <Card
      className={cn(
        "overflow-hidden border-border/60 shadow-sm transition-shadow hover:shadow-md",
        tone === "warning" && "border-amber-500/30 bg-amber-500/[0.03]",
        tone === "success" && "border-emerald-500/30 bg-emerald-500/[0.03]"
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground sm:text-sm">{title}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      </CardHeader>
      <CardContent>
        <p className="text-lg font-bold tabular-nums tracking-tight sm:text-xl">{value}</p>
        {hint ? <p className="mt-1 text-[11px] text-muted-foreground leading-snug">{hint}</p> : null}
      </CardContent>
    </Card>
  );

  return (
    <motion.div {...cardMotion} transition={{ delay }}>
      {href ? (
        <Link href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </motion.div>
  );
}

export function FreelanceKpiStrip() {
  const t = useTranslations("freelanceKpi");
  const { year, month } = useMonth();

  const { data, isLoading } = useQuery({
    queryKey: ["freelance-kpis", year, month],
    queryFn: () =>
      jsonFetch<{ data: FreelanceKpis }>(`/api/freelance/kpis?year=${year}&month=${month}`),
  });

  const k = data?.data;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl border border-border/50 bg-muted/20" />
        ))}
      </div>
    );
  }

  if (!k) return null;

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{t("title")}</h2>
        <Link href="/clients" className="text-xs text-primary hover:underline">
          {t("viewClients")}
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          title={t("clients")}
          value={String(k.clientCount)}
          icon={<Users className="size-4" />}
          href="/clients"
          delay={0.03}
        />
        <KpiCard
          title={t("activeProjects")}
          value={String(k.activeProjects)}
          icon={<Briefcase className="size-4" />}
          href="/projects?collected=pending"
          delay={0.06}
        />
        <KpiCard
          title={t("totalPending")}
          value={formatMoney(k.totalPending)}
          icon={<Clock className="size-4" />}
          href="/projects?collected=pending"
          tone="warning"
          delay={0.09}
        />
        <KpiCard
          title={t("monthCollected")}
          value={formatMoney(k.monthCollected)}
          hint={t("monthCollectedHint")}
          icon={<Wallet className="size-4" />}
          tone="success"
          delay={0.12}
        />
        <KpiCard
          title={t("dueThisWeek")}
          value={String(k.dueThisWeek)}
          hint={t("dueThisWeekHint")}
          icon={<CalendarClock className="size-4" />}
          href="/projects?collected=pending"
          delay={0.15}
        />
        <KpiCard
          title={t("overdue")}
          value={String(k.overdueCount)}
          hint={t("overdueHint")}
          icon={<AlertTriangle className="size-4" />}
          href="/projects?collected=pending"
          tone={k.overdueCount > 0 ? "warning" : "default"}
          delay={0.18}
        />
      </div>
    </section>
  );
}
