"use client";

import { CategorySelectField } from "@/components/categories/category-select-field";

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
  return (
    <div id={id} className={className}>
      <CategorySelectField
        type="expense"
        value={value}
        onChange={onCategoryChange}
        label="Category"
      />
    </div>
  );
}
