"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import type { ProjectCurrency } from "@/lib/currency";
import { PROJECT_CURRENCIES } from "@/lib/currency";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  value: ProjectCurrency;
  onChange: (v: ProjectCurrency) => void;
  className?: string;
};

export function ProjectCurrencyField({ id, value, onChange, className }: Props) {
  const t = useTranslations("projects");

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>{t("currency")}</Label>
      <select
        id={id}
        className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value as ProjectCurrency)}
      >
        {PROJECT_CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c === "SAR" ? t("currencySar") : t("currencyEgp")}
          </option>
        ))}
      </select>
    </div>
  );
}
