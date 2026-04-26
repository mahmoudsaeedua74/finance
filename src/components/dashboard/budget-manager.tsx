"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useTodayYearMonth } from "@/hooks/use-today-year-month";
import { EXPENSE_CATEGORY_PRESETS, labelExpenseCategory } from "@/lib/expense-categories";
import { jsonFetch } from "@/lib/fetcher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function BudgetManager() {
  const t = useTranslations("dashboard");
  const tC = useTranslations("common");
  const tCat = useTranslations("expense.categories");
  const { year, month } = useTodayYearMonth();
  const qc = useQueryClient();
  const [category, setCategory] = useState<string>(EXPENSE_CATEGORY_PRESETS[0]);
  const [limit, setLimit] = useState("");

  const save = useMutation({
    mutationFn: () =>
      jsonFetch("/api/budgets", {
        method: "POST",
        body: JSON.stringify({ category, year, month, limit: Number(limit) }),
      }),
    onSuccess: () => {
      toast.success(t("budgetSaved"));
      setLimit("");
      qc.invalidateQueries({ queryKey: ["budgets-usage", year, month] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("budgetSetTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 sm:flex-row">
        <select
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {EXPENSE_CATEGORY_PRESETS.map((c) => (
            <option key={c} value={c}>
              {labelExpenseCategory(c, tCat)}
            </option>
          ))}
        </select>
        <Input
          type="number"
          placeholder={t("limitPlaceholder")}
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          className="h-10"
        />
        <Button
          type="button"
          className="h-10"
          disabled={!limit || save.isPending}
          onClick={() => save.mutate()}
        >
          {tC("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
