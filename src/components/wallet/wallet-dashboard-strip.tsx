"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { jsonFetch } from "@/lib/fetcher";
import { formatMoney } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
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

/** Dashboard hero strip: cash / card / total with quick edit. */
export function WalletDashboardStrip() {
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
    if (summary) {
      setCash(String(summary.openingCash));
      setCard(String(summary.openingCard));
    }
  }, [summary]);

  const save = useMutation({
    mutationFn: () =>
      jsonFetch("/api/wallet", {
        method: "PUT",
        body: JSON.stringify({
          openingCash: Number(cash) || 0,
          openingCard: Number(card) || 0,
        }),
      }),
    onSuccess: () => {
      toast.success(tC("save"));
      setEditOpen(false);
      void qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="h-[5.5rem] animate-pulse rounded-2xl bg-muted/25" />;
  }
  if (!summary) return null;

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

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold tracking-tight">{t("title")}</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-xs text-muted-foreground"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-3.5" />
            {t("editOpening")}
          </Button>
        </div>
        <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-3">
          {tiles.map((tile) => (
            <Card
              key={tile.key}
              className={cn(
                "overflow-hidden border bg-gradient-to-br shadow-sm",
                tile.className
              )}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl bg-background/60 ring-1 ring-border/50",
                    tile.iconClass
                  )}
                >
                  <tile.icon className="size-5" aria-hidden />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{tile.label}</p>
                  <p className="truncate font-mono text-xl font-bold tabular-nums tracking-tight">
                    {formatMoney(tile.value)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-[0.7rem] leading-snug text-muted-foreground">{t("desc")}</p>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editOpening")}</DialogTitle>
            <DialogDescription>{t("openingHint")}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dash-wallet-cash">{t("openingCash")}</Label>
              <Input
                id="dash-wallet-cash"
                type="number"
                step="0.01"
                className="h-11"
                value={cash}
                onChange={(e) => setCash(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dash-wallet-card">{t("openingCard")}</Label>
              <Input
                id="dash-wallet-card"
                type="number"
                step="0.01"
                className="h-11"
                value={card}
                onChange={(e) => setCard(e.target.value)}
              />
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
    </>
  );
}
