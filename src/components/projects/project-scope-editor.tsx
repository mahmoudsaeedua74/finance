"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ProjectScopeItem, ScopeComplexity } from "@/lib/project-scope";

type Props = {
  items: ProjectScopeItem[];
  onChange: (items: ProjectScopeItem[]) => void;
  labels: {
    title: string;
    itemTitle: string;
    description: string;
    amount: string;
    tech: string;
    complexity: string;
    add: string;
    complexityLow: string;
    complexityMid: string;
    complexityHigh: string;
  };
};

const emptyItem = (): ProjectScopeItem => ({
  title: "",
  description: "",
  amount: undefined,
  tech: "",
});

export function ProjectScopeEditor({ items, onChange, labels }: Props) {
  const update = (index: number, patch: Partial<ProjectScopeItem>) => {
    onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-sm font-medium">{labels.title}</Label>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...items, emptyItem()])}>
          <Plus className="me-1 size-3.5" />
          {labels.add}
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{labels.add}</p>
      ) : (
        items.map((item, index) => (
          <div key={index} className="space-y-2 rounded-xl border border-border/70 bg-muted/10 p-3">
            <div className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">{labels.itemTitle}</Label>
                  <Input
                    value={item.title}
                    onChange={(e) => update(index, { title: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">{labels.description}</Label>
                  <Textarea
                    value={item.description ?? ""}
                    onChange={(e) => update(index, { description: e.target.value })}
                    rows={2}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{labels.amount}</Label>
                  <Input
                    type="number"
                    value={item.amount ?? ""}
                    onChange={(e) =>
                      update(index, {
                        amount: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="h-9"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{labels.tech}</Label>
                  <Input
                    value={item.tech ?? ""}
                    onChange={(e) => update(index, { tech: e.target.value })}
                    className="h-9"
                    placeholder="CSS + JS"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{labels.complexity}</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={item.complexity ?? ""}
                    onChange={(e) =>
                      update(index, {
                        complexity: (e.target.value || undefined) as ScopeComplexity | undefined,
                      })
                    }
                  >
                    <option value="">—</option>
                    <option value="low">{labels.complexityLow}</option>
                    <option value="mid">{labels.complexityMid}</option>
                    <option value="high">{labels.complexityHigh}</option>
                  </select>
                </div>
              </div>
              <Button type="button" size="icon" variant="ghost" className="size-8 shrink-0" onClick={() => remove(index)}>
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
