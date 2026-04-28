"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Gem, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { jsonFetch } from "@/lib/fetcher";
import { formatMoney } from "@/lib/format";
import { useGoldPrices } from "@/hooks/use-gold-prices";
import { toast } from "sonner";

type GoldHoldingDto = {
  id: string;
  weightPerBar: number;
  numberOfBars: number;
  karat: 18 | 21 | 24;
  createdAt: string;
};

export default function GoldPage() {
  const t = useTranslations("gold");
  const tC = useTranslations("common");
  const qc = useQueryClient();
  const [weightPerBar, setWeightPerBar] = useState("10");
  const [numberOfBars, setNumberOfBars] = useState("1");
  const [karat, setKarat] = useState<18 | 21 | 24>(24);
  const [manual24, setManual24] = useState("");
  const pricesQ = useGoldPrices();
  const holdingsQ = useQuery({
    queryKey: ["gold-holdings"],
    queryFn: () => jsonFetch<{ data: GoldHoldingDto[] }>("/api/gold"),
  });

  const addHolding = useMutation({
    mutationFn: () =>
      jsonFetch("/api/gold", {
        method: "POST",
        body: JSON.stringify({
          weightPerBar: Number(weightPerBar),
          numberOfBars: Number(numberOfBars),
          karat,
        }),
      }),
    onSuccess: () => {
      toast.success(t("saved"));
      void qc.invalidateQueries({ queryKey: ["gold-holdings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const prices = pricesQ.data?.data;
  const live24 = Number(manual24) > 0 ? Number(manual24) : prices?.karat24 ?? 0;
  const live21 = live24 * 0.875;
  const live18 = live24 * 0.75;
  const priceByKarat = { 24: live24, 21: live21, 18: live18 } as const;

  const totals = useMemo(() => {
    const rows = holdingsQ.data?.data ?? [];
    const grams = rows.reduce((s, r) => s + r.weightPerBar * r.numberOfBars, 0);
    const value = rows.reduce(
      (s, r) => s + r.weightPerBar * r.numberOfBars * priceByKarat[r.karat],
      0
    );
    return { grams, value };
  }, [holdingsQ.data?.data, priceByKarat]);

  return (
    <div className="max-w-4xl space-y-4">
      <PageHeader title={t("title")} description={t("desc")} icon={<Gem className="size-5" />} />

      <Card>
        <CardHeader>
          <CardTitle>{t("prices")}</CardTitle>
          <CardDescription>{t("pricesDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-3">
            <Label>{t("manual24")}</Label>
            <Input value={manual24} onChange={(e) => setManual24(e.target.value)} type="number" />
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <p className="text-muted-foreground">24K</p>
            <p className="font-semibold tabular-nums">{formatMoney(live24)}</p>
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <p className="text-muted-foreground">21K</p>
            <p className="font-semibold tabular-nums">{formatMoney(live21)}</p>
          </div>
          <div className="rounded-lg border p-3 text-sm">
            <p className="text-muted-foreground">18K</p>
            <p className="font-semibold tabular-nums">{formatMoney(live18)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("addHolding")}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="space-y-2">
            <Label>{t("weightPerBar")}</Label>
            <Input type="number" value={weightPerBar} onChange={(e) => setWeightPerBar(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("bars")}</Label>
            <Input type="number" value={numberOfBars} onChange={(e) => setNumberOfBars(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>{t("karat")}</Label>
            <select
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={String(karat)}
              onChange={(e) => setKarat(Number(e.target.value) as 18 | 21 | 24)}
            >
              <option value="24">24K</option>
              <option value="21">21K</option>
              <option value="18">18K</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              className="h-11 w-full"
              onClick={() => addHolding.mutate()}
              disabled={addHolding.isPending}
            >
              {addHolding.isPending ? (
                <>
                  <Loader2 className="me-2 size-4 animate-spin" />
                  {tC("saving")}
                </>
              ) : (
                t("addHolding")
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("portfolio")}</CardTitle>
          <CardDescription>
            {t("totalGrams")}: {totals.grams.toFixed(2)}g · {t("totalValue")}: {formatMoney(totals.value)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {holdingsQ.isLoading ? (
            <p className="text-sm text-muted-foreground">{tC("loading")}</p>
          ) : holdingsQ.error ? (
            <p className="text-sm text-destructive">{(holdingsQ.error as Error).message}</p>
          ) : (holdingsQ.data?.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="space-y-2">
              {(holdingsQ.data?.data ?? []).map((r) => {
                const grams = r.weightPerBar * r.numberOfBars;
                const value = grams * priceByKarat[r.karat];
                return (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div>
                      <p className="font-medium">
                        {r.numberOfBars} × {r.weightPerBar}g · {r.karat}K
                      </p>
                      <p className="text-muted-foreground">{grams.toFixed(2)}g</p>
                    </div>
                    <p className="font-semibold tabular-nums">{formatMoney(value)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
