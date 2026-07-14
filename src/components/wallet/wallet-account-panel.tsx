"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { jsonFetch } from "@/lib/fetcher";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Banknote, CreditCard, Wallet, Pencil } from "lucide-react";
import type { WalletSummary } from "@/types/wallet";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { WalletCompactBalances } from "@/components/wallet/wallet-compact-balances";

type Variant = "strip" | "card" | "compact";

function BalanceTiles({
  summary,
  t,
  size = "md",
}: {
  summary: WalletSummary;
  t: (k: string) => string;
  size?: "sm" | "md";
}) {
  const tiles = [
    {
      key: "cash",
      label: t("cash"),
      value: summary.cashBalance,
      icon: Banknote,
      className: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
      iconClass: "text-emerald-600 dark:text-emerald-400",
    },
    {
      key: "card",
      label: t("card"),
      value: summary.cardBalance,
      icon: CreditCard,
      className: "from-sky-500/10 to-sky-500/5 border-sky-500/20",
      iconClass: "text-sky-600 dark:text-sky-400",
    },
    {
      key: "total",
      label: t("total"),
      value: summary.totalBalance,
      icon: Wallet,
      className: "from-primary/15 to-primary/5 border-primary/25",
      iconClass: "text-primary",
    },
  ] as const;

  const textSize = size === "sm" ? "text-lg" : "text-xl";

  return (
    <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
      {tiles.map((tile) => (
        <Card
          key={tile.key}
          className={cn("overflow-hidden border bg-gradient-to-br shadow-sm", tile.className)}
        >
          <CardContent className={cn("flex items-center gap-3", size === "sm" ? "p-3" : "p-4")}>
            <div
              className={cn(
                "flex shrink-0 items-center justify-center rounded-xl bg-background/60 ring-1 ring-border/50",
                size === "sm" ? "size-9" : "size-10",
                tile.iconClass
              )}
            >
              <tile.icon className={size === "sm" ? "size-4" : "size-5"} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">{tile.label}</p>
              <p className={cn("truncate font-mono font-bold tabular-nums tracking-tight", textSize)}>
                {formatMoney(tile.value)}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function WalletAccountPanel({ variant = "strip" }: { variant?: Variant }) {
  const t = useTranslations("wallet");
  const tC = useTranslations("common");
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => jsonFetch<{ data: WalletSummary }>("/api/wallet"),
  });
  const summary = data?.data;
  const [editOpen, setEditOpen] = useState(false);
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");

  useEffect(() => {
    if (summary && editOpen) {
      setCash(String(summary.cashBalance));
      setCard(String(summary.cardBalance));
    }
  }, [summary, editOpen]);

  const editTotal = useMemo(() => {
    const c = Number(cash) || 0;
    const v = Number(card) || 0;
    return c + v;
  }, [cash, card]);

  const save = useMutation({
    mutationFn: () =>
      jsonFetch("/api/wallet", {
        method: "PUT",
        body: JSON.stringify({
          cashBalance: Number(cash) || 0,
          cardBalance: Number(card) || 0,
        }),
      }),
    onSuccess: () => {
      toast.success(t("saved"));
      setEditOpen(false);
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    const h = variant === "compact" ? "h-[4.75rem]" : variant === "card" ? "h-48" : "h-[5.5rem]";
    return <div className={cn(h, "animate-pulse rounded-2xl bg-muted/25")} />;
  }
  if (!summary) return null;

  const editButton = (
    <Button
      type="button"
      variant={variant === "card" ? "outline" : "ghost"}
      size="sm"
      className={cn("gap-1.5", variant === "strip" && "h-8 text-xs text-muted-foreground")}
      onClick={() => setEditOpen(true)}
    >
      <Pencil className="size-3.5" />
      {t("updateBalance")}
    </Button>
  );

  const editDialog = (
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("updateBalance")}</DialogTitle>
          <DialogDescription>{t("updateHint")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="wallet-cash-now">{t("currentCash")}</Label>
              <Input
                id="wallet-cash-now"
                type="number"
                step="0.01"
                min="0"
                className="h-11"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wallet-card-now">{t("currentCard")}</Label>
              <Input
                id="wallet-card-now"
                type="number"
                step="0.01"
                min="0"
                className="h-11"
                value={card}
                onChange={(e) => setCard(e.target.value)}
              />
            </div>
          </div>
          <div className="rounded-xl border border-primary/25 bg-primary/5 px-4 py-3">
            <p className="text-xs text-muted-foreground">{t("total")}</p>
            <p className="font-mono text-2xl font-bold tabular-nums">{formatMoney(editTotal)}</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
            {tC("cancel")}
          </Button>
          <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
            {tC("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (variant === "compact") {
    return (
      <>
        <WalletCompactBalances summary={summary} />
        <div className="mt-2">{editButton}</div>
        {editDialog}
      </>
    );
  }

  if (variant === "card") {
    return (
      <>
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Wallet className="size-4" />
                  {t("accountsTitle")}
                </CardTitle>
                <CardDescription className="mt-1">{t("accountsDesc")}</CardDescription>
              </div>
              {editButton}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <BalanceTiles summary={summary} t={t} />
            <p className="text-xs text-muted-foreground">{t("desc")}</p>
          </CardContent>
        </Card>
        {editDialog}
      </>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">{t("title")}</h2>
          {editButton}
        </div>
        <BalanceTiles summary={summary} t={t} />
        <p className="text-[0.7rem] leading-snug text-muted-foreground">{t("desc")}</p>
      </div>
      {editDialog}
    </>
  );
}
