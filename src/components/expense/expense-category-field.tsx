"use client";

import { useTranslations } from "next-intl";
import { CategorySelectField } from "@/components/categories/category-select-field";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  value: string;
  onCategoryChange: (v: string) => void;
  className?: string;
  label?: string;
  /** When false, parent should render the field label. Default false for nested forms. */
  showLabel?: boolean;
};

export function ExpenseCategoryField({
  id,
  value,
  onCategoryChange,
  className,
  label,
  showLabel = false,
}: Props) {
  const tC = useTranslations("common");

  return (
    <div id={id} className={cn("min-w-0 w-full", className)}>
      <CategorySelectField
        type="expense"
        value={value}
        onChange={onCategoryChange}
        label={label ?? tC("category")}
        showLabel={showLabel}
      />
    </div>
  );
}
