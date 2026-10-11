"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppSelect } from "@/components/ui/app-select";
import { useCategories, useCreateCategory, type CategoryType } from "@/hooks/use-categories";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { isIncomeTypeSlug } from "@/lib/income-types";
import { labelExpenseCategory } from "@/lib/expense-categories";
import { cn } from "@/lib/utils";

type Props = {
  type: CategoryType;
  value: string;
  onChange: (next: string) => void;
  label: string;
  /** When false, only the control row is rendered (parent owns the label). */
  showLabel?: boolean;
};

export function CategorySelectField({
  type,
  value,
  onChange,
  label,
  showLabel = true,
}: Props) {
  const tC = useTranslations("common");
  const tInc = useTranslations("income.types");
  const tCat = useTranslations("expense.categories");
  const { data, isLoading } = useCategories(type);
  const add = useCreateCategory(type);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const names = useMemo(
    () => (data?.data ?? []).map((r) => r.name),
    [data?.data],
  );

  const displayLabel = (name: string) => {
    if (type === "income") {
      return isIncomeTypeSlug(name) ? tInc(name) : name;
    }
    return labelExpenseCategory(name, tCat);
  };

  const options = useMemo(() => {
    const list = [...names];
    if (value && !list.includes(value)) list.unshift(value);
    return list.map((n) => ({ value: n, label: displayLabel(n) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [names, value, type, tInc, tCat]);

  const addLabel = `${tC("add")} ${label}`;

  return (
    <div className={cn(showLabel ? "space-y-2" : undefined)}>
      {showLabel ? (
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      ) : null}
      <div className="flex items-center gap-2">
        <AppSelect
          className="min-w-0 flex-1"
          value={value}
          onValueChange={onChange}
          options={options}
          placeholder={isLoading ? tC("loading") : label}
          disabled={isLoading && options.length === 0}
          aria-label={label}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0 rounded-lg border-border/80"
          onClick={() => setOpen(true)}
          aria-label={addLabel}
          title={addLabel}
        >
          <Plus className="size-3.5" aria-hidden />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{addLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="new-category-name">{tC("title")}</Label>
            <Input
              id="new-category-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={label}
              className="h-11 rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setOpen(false)}
            >
              {tC("cancel")}
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={() =>
                add.mutate(newName, {
                  onSuccess: (res) => {
                    onChange(res.data.name);
                    setNewName("");
                    setOpen(false);
                    toast.success(tC("save"));
                  },
                  onError: (e: Error) => toast.error(e.message),
                })
              }
              disabled={add.isPending || !newName.trim()}
            >
              {tC("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
