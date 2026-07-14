"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Gem, Loader2, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { jsonFetch } from "@/lib/fetcher";
import { formatMoney } from "@/lib/format";
import { useGoldPrices } from "@/hooks/use-gold-prices";
import { toast } from "sonner";
import { TrendingUp, ShieldCheck, Scale } from "lucide-react";

type GoldHoldingDto = {
  id: string;
  weightPerBar: number;
  numberOfBars: number;
  karat: 18 | 21 | 24;
  createdAt: string;
};

function KaratSelect({
  value,
  onChange,
  id,
}: {
  value: 18 | 21 | 24;
  onChange: (v: 18 | 21 | 24) => void;
  id?: string;
}) {
  return (
    <select
      id={id}
      className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
      value={String(value)}
      onChange={(e) => onChange(Number(e.target.value) as 18 | 21 | 24)}
    >
      <option value="24">24K</option>
      <option value="21">21K</option>
      <option value="18">18K</option>
    </select>
  );
}

export default function GoldPage() {
  const t = useTranslations("gold");
  const tC = useTranslations("common");
  const qc = useQueryClient();
  const [weightPerBar, setWeightPerBar] = useState("10");
  const [numberOfBars, setNumberOfBars] = useState("1");
  const [karat, setKarat] = useState<18 | 21 | 24>(24);
  const [manual24, setManual24] = useState("");
  const [edit, setEdit] = useState<GoldHoldingDto | null>(null);
  const [editWeight, setEditWeight] = useState("");
  const [editBars, setEditBars] = useState("");
  const [editKarat, setEditKarat] = useState<18 | 21 | 24>(24);
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

  const updateHolding = useMutation({
    mutationFn: (payload: { id: string; weightPerBar: number; numberOfBars: number; karat: 18 | 21 | 24 }) =>
      jsonFetch(`/api/gold/${payload.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          weightPerBar: payload.weightPerBar,
          numberOfBars: payload.numberOfBars,
          karat: payload.karat,
        }),
      }),
    onSuccess: () => {
      toast.success(tC("updated"));
      setEdit(null);
      void qc.invalidateQueries({ queryKey: ["gold-holdings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteHolding = useMutation({
    mutationFn: (id: string) =>
      jsonFetch(`/api/gold/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      toast.success(tC("deleted"));
      void qc.invalidateQueries({ queryKey: ["gold-holdings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (row: GoldHoldingDto) => {
    setEdit(row);
    setEditWeight(String(row.weightPerBar));
    setEditBars(String(row.numberOfBars));
    setEditKarat(row.karat);
  };

  const prices = pricesQ.data?.data;
  const live24 = Number(manual24) > 0 ? Number(manual24) : prices?.karat24 ?? 0;
  const live21 = live24 * 0.875;
  const live18 = live24 * 0.75;
  const priceByKarat = useMemo(() => ({ 24: live24, 21: live21, 18: live18 } as const), [live24, live21, live18]);

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
    <div className="max-w-6xl space-y-5">
      <PageHeader title={t("title")} description={t("desc")} icon={<Gem className="size-5" />} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">{t("totalGrams")}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">{totals.grams.toFixed(2)}g</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground flex items-center gap-1.5">
            <Scale className="size-3.5" />
            {t("portfolio")}
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">{t("totalValue")}</CardDescription>
            <CardTitle className="font-mono text-2xl tabular-nums">{formatMoney(totals.value)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="size-3.5" />
            Live valuation
          </CardContent>
        </Card>
        <Card className="border-border/70 shadow-sm sm:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs">{t("prices")}</CardDescription>
            <CardTitle className="text-base">24K: {formatMoney(live24)} · 21K: {formatMoney(live21)} · 18K: {formatMoney(live18)}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" />
            Source: live APIs with hourly cache and optional manual override
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70 shadow-sm">
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

      <Card className="border-border/70 shadow-sm">
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
            <Label htmlFor="gold-karat">{t("karat")}</Label>
            <KaratSelect id="gold-karat" value={karat} onChange={setKarat} />
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

      <Card className="border-border/70 shadow-sm">
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
                  <div key={r.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {r.numberOfBars} × {r.weightPerBar}g · {r.karat}K
                      </p>
                      <p className="text-muted-foreground">{grams.toFixed(2)}g</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <p className="me-1 font-semibold tabular-nums">{formatMoney(value)}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0"
                        aria-label={tC("edit")}
                        onClick={() => openEdit(r)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0 text-destructive hover:text-destructive"
                        aria-label={tC("delete")}
                        disabled={deleteHolding.isPending}
                        onClick={() => {
                          if (confirm(t("deleteHoldingQ"))) deleteHolding.mutate(r.id);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!edit} onOpenChange={(open) => !open && setEdit(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editHolding")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-gold-weight">{t("weightPerBar")}</Label>
              <Input
                id="edit-gold-weight"
                type="number"
                value={editWeight}
                onChange={(e) => setEditWeight(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-gold-bars">{t("bars")}</Label>
              <Input
                id="edit-gold-bars"
                type="number"
                value={editBars}
                onChange={(e) => setEditBars(e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="edit-gold-karat">{t("karat")}</Label>
              <KaratSelect id="edit-gold-karat" value={editKarat} onChange={setEditKarat} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setEdit(null)}>
              {tC("cancel")}
            </Button>
            <Button
              type="button"
              disabled={updateHolding.isPending || !edit}
              onClick={() => {
                if (!edit) return;
                updateHolding.mutate({
                  id: edit.id,
                  weightPerBar: Number(editWeight),
                  numberOfBars: Number(editBars),
                  karat: editKarat,
                });
              }}
            >
              {updateHolding.isPending ? (
                <>
                  <Loader2 className="me-2 size-4 animate-spin" />
                  {tC("saving")}
                </>
              ) : (
                tC("save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
