"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useMutation } from "@tanstack/react-query";
import { useFinanceInvalidation } from "@/hooks/use-finance-invalidation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { jsonFetch } from "@/lib/fetcher";
import { toast } from "sonner";
import { Link } from "@/i18n/navigation";
import { defaultFormDateYmd } from "@/lib/ymd";
import { CategorySelectField } from "@/components/categories/category-select-field";
import { normalizeIncomeType } from "@/lib/income-types";

export default function NewIncomePage() {
  const t = useTranslations("income");
  const tC = useTranslations("common");
  const router = useRouter();
  const { invalidateIncomes } = useFinanceInvalidation();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => defaultFormDateYmd());
  const [incomeCategory, setIncomeCategory] = useState<string>("salary");

  const m = useMutation({
    mutationFn: () =>
      jsonFetch("/api/incomes", {
        method: "POST",
        body: JSON.stringify({
          title,
          amount: parseFloat(amount),
          date: new Date(date).toISOString(),
          incomeType: normalizeIncomeType(incomeCategory),
          category: incomeCategory,
        }),
      }),
    onMutate: () => {
      const toastId = toast.loading(tC("savingIncome"));
      return { toastId };
    },
    onSuccess: (_d, _v, ctx) => {
      if (ctx?.toastId) {
        toast.success(t("saved"), { id: ctx.toastId });
      } else {
        toast.success(t("saved"));
      }
      invalidateIncomes();
      router.push("/income");
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.toastId) {
        toast.error(e.message, { id: ctx.toastId });
      } else {
        toast.error(e.message);
      }
    },
  });

  return (
    <div className="max-w-lg space-y-4">
      <PageHeader
        title={t("newTitle")}
        description={
          <>
            {t("newDesc1")}
            <Link className="underline" href="/projects">
              {t("newProjects")}
            </Link>
            {t("newDesc2")}
          </>
        }
      />
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
              aria-describedby="income-title-help"
            />
            <p id="income-title-help" className="text-xs text-muted-foreground">
              {t("titleHelp")}
            </p>
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
          <CategorySelectField
            type="income"
            value={incomeCategory}
            onChange={setIncomeCategory}
            label={tC("category")}
          />
          <div className="flex flex-col-reverse gap-2 min-[400px]:flex-row">
            <Button
              type="button"
              className="min-h-12 w-full touch-manipulation min-[400px]:w-auto"
              onClick={() => m.mutate()}
              disabled={!title || !amount || m.isPending}
            >
              {m.isPending ? (
                <>
                  <Loader2 className="me-2 size-4 animate-spin" />
                  {tC("saving")}
                </>
              ) : (
                tC("save")
              )}
            </Button>
            <Button
              type="button"
              className="min-h-12 w-full touch-manipulation min-[400px]:w-auto"
              variant="outline"
              onClick={() => router.back()}
              disabled={m.isPending}
            >
              {tC("cancel")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
