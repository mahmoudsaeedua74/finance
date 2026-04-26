"use client";

import { useTranslations } from "next-intl";
import {
  EXPENSE_CATEGORY_PRESETS,
  EXPENSE_CUSTOM_SELECT_VALUE,
  isPresetExpenseCategory,
} from "@/lib/expense-categories";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  id: string;
  value: string;
  onCategoryChange: (v: string) => void;
  className?: string;
};

export function ExpenseCategoryField({
  id,
  value,
  onCategoryChange,
  className,
}: Props) {
  const t = useTranslations("expense.categories");
  const selectValue = isPresetExpenseCategory(value)
    ? value
    : EXPENSE_CUSTOM_SELECT_VALUE;
  const customText = isPresetExpenseCategory(value) ? "" : value;

  return (
    <div className="space-y-2">
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v == null) return;
          if (v === EXPENSE_CUSTOM_SELECT_VALUE) {
            onCategoryChange(
              isPresetExpenseCategory(value) ? "" : value
            );
          } else {
            onCategoryChange(v);
          }
        }}
      >
        <SelectTrigger
          id={id}
          className={cn("h-11 w-full min-w-0 justify-between", className)}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="start" sideOffset={4}>
          {EXPENSE_CATEGORY_PRESETS.map((k) => (
            <SelectItem key={k} value={k} className="cursor-pointer">
              {t(k)}
            </SelectItem>
          ))}
          <SelectItem value={EXPENSE_CUSTOM_SELECT_VALUE} className="cursor-pointer">
            {t("custom")}
          </SelectItem>
        </SelectContent>
      </Select>
      {selectValue === EXPENSE_CUSTOM_SELECT_VALUE && (
        <Input
          className={className}
          value={customText}
          onChange={(e) => onCategoryChange(e.target.value)}
          placeholder={t("customPlaceholder")}
          aria-label={t("custom")}
        />
      )}
    </div>
  );
}
