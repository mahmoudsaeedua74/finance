"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { jsonFetch } from "@/lib/fetcher";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Banknote, CreditCard, Wallet } from "lucide-react";
import type { WalletSummary } from "@/types/wallet";
import { WalletCompactBalances } from "@/components/wallet/wallet-compact-balances";

export function WalletSummaryCard({ compact }: { compact?: boolean }) {
  const t = useTranslations("wallet");
  const tC = useTranslations("common");
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => jsonFetch<{ data: WalletSummary }>("/api/wallet"),
  });
  const summary = data?.data;
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (summary && !editOpen) {
      setCash(String(summary.openingCash));
      setCard(String(summary.openingCard));
    }
  }, [summary, editOpen]);

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

  if (isLoading || !summary) {
    return (
      <div className={compact ? "h-20 animate-pulse rounded-xl bg-muted/30" : "h-40 animate-pulse rounded-xl bg-muted/30"} />
    );
  }

  if (compact) {
    return (
      <WalletCompactBalances summary={summary} className="bg-muted/15" />
    );
  }

  return (
    <Card className="border-border/70 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="size-4" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Banknote className="size-3.5" />
              {t("cash")}
            </div>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{formatMoney(summary.cashBalance)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="size-3.5" />
              {t("card")}
            </div>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{formatMoney(summary.cardBalance)}</p>
          </div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div className="text-xs text-muted-foreground">{t("total")}</div>
            <p className="mt-1 font-mono text-xl font-bold tabular-nums">{formatMoney(summary.totalBalance)}</p>
          </div>
        </div>

        {!editOpen ? (
          <Button type="button" variant="outline" className="h-10" onClick={() => setEditOpen(true)}>
            {t("editOpening")}
          </Button>
        ) : (
          <div className="space-y-3 rounded-xl border border-border/60 p-3">
            <p className="text-xs text-muted-foreground">{t("openingHint")}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="wallet-cash">{t("openingCash")}</Label>
                <Input
                  id="wallet-cash"
                  type="number"
                  step="0.01"
                  className="h-11"
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wallet-card">{t("openingCard")}</Label>
                <Input
                  id="wallet-card"
                  type="number"
                  step="0.01"
                  className="h-11"
                  value={card}
                  onChange={(e) => setCard(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                {tC("cancel")}
              </Button>
              <Button type="button" onClick={() => save.mutate()} disabled={save.isPending}>
                {tC("save")}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
