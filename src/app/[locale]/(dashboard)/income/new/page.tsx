"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jsonFetch } from "@/lib/fetcher";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { useMonth } from "@/context/month-context";

const values = ["salary", "freelance", "other"] as const;

export default function NewIncomePage() {
  const t = useTranslations("income");
  const tC = useTranslations("common");
  const router = useRouter();
  const qc = useQueryClient();
  const { year, month } = useMonth();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    () => new Date(year, month - 1, 15).toISOString().slice(0, 10)
  );
  const [incomeType, setIncomeType] = useState<string>("other");

  const m = useMutation({
    mutationFn: () =>
      jsonFetch("/api/incomes", {
        method: "POST",
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          date: new Date(date).toISOString(),
          incomeType,
        }),
      }),
    onSuccess: () => {
      toast.success(t("saved"));
      qc.invalidateQueries({ queryKey: ["incomes"] });
      qc.invalidateQueries({ queryKey: ["report", year, month] });
      router.push("/income");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{t("newTitle")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("newDesc1")}
          <Link className="underline" href="/projects">
            {t("newProjects")}
          </Link>
          {t("newDesc2")}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("newCardT")}</CardTitle>
          <CardDescription>{t("newCardD")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">{tC("title")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("phTitle")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">{tC("amount")}</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">{tC("date")}</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>{tC("type")}</Label>
            <Select value={incomeType} onValueChange={(v) => v && setIncomeType(v)}>
              <SelectTrigger className="h-11 min-h-11 w-full data-[size=default]:h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {values.map((v) => (
                  <SelectItem key={v} value={v}>
                    {t(`types.${v}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col-reverse gap-2 min-[400px]:flex-row">
            <Button
              type="button"
              className="min-h-12 w-full touch-manipulation min-[400px]:w-auto"
              onClick={() => m.mutate()}
              disabled={!title || !amount}
            >
              {tC("save")}
            </Button>
            <Button
              type="button"
              className="min-h-12 w-full touch-manipulation min-[400px]:w-auto"
              variant="outline"
              onClick={() => router.back()}
            >
              {tC("cancel")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
