"use client";

import { Label } from "@/components/ui/label";
import { AppSelect } from "@/components/ui/app-select";
import { cn } from "@/lib/utils";

export type FilterSelectOption = {
  value: string;
  label: string;
};

type Props = {
  id: string;
  label: string;
  value: string;
  options: FilterSelectOption[];
  onChange: (value: string) => void;
  active?: boolean;
  className?: string;
};

export function FilterNativeSelect({
  id,
  label,
  value,
  options,
  onChange,
  active,
  className,
}: Props) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <AppSelect
        id={id}
        value={value}
        onValueChange={onChange}
        options={options}
        aria-label={label}
        size="sm"
        triggerClassName={cn(
          "h-10 min-h-10",
          active && "border-primary/40 ring-1 ring-primary/20",
        )}
      />
    </div>
  );
}
