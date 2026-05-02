"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategories, useCreateCategory, type CategoryType } from "@/hooks/use-categories";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

type Props = {
  type: CategoryType;
  value: string;
  onChange: (next: string) => void;
  label: string;
};

export function CategorySelectField({ type, value, onChange, label }: Props) {
  const tC = useTranslations("common");
  const { data, isLoading } = useCategories(type);
  const add = useCreateCategory(type);
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");

  const names = useMemo(
    () => (data?.data ?? []).map((r) => r.name),
    [data?.data]
  );

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="flex gap-2">
        <Select value={value} onValueChange={(v) => v && onChange(v)}>
          <SelectTrigger className="h-11 rounded-xl border-border/80 bg-background shadow-sm">
            <SelectValue placeholder={isLoading ? tC("loading") : label} />
          </SelectTrigger>
          <SelectContent>
            {names.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          className="h-11 shrink-0 rounded-xl border-border/80"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-4" />
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {tC("add")} {label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{tC("title")}</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={label}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {tC("cancel")}
            </Button>
            <Button
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
