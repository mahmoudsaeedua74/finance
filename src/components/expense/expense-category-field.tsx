"use client";

import { CategorySelectField } from "@/components/categories/category-select-field";

type Props = {
  id: string;
  value: string;
  onCategoryChange: (v: string) => void;
  className?: string;
};

export function ExpenseCategoryField({
  id: _id,
  value,
  onCategoryChange,
  className: _className,
}: Props) {
  return (
    <CategorySelectField
      type="expense"
      value={value}
      onChange={onCategoryChange}
      label="Category"
    />
  );
}
