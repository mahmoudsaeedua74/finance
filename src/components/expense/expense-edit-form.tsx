"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toLocalYmd } from "@/lib/ymd";
import { Button } from "@/components/ui/button";
import {
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExpenseCategoryField } from "@/components/expense/expense-category-field";
import { ProjectSpendField } from "@/components/expense/project-spend-field";
import { useUpdateExpense, type ExpenseRow } from "@/features/expenses/hooks";
import { Loader2 } from "lucide-react";

/** Shared expense / recurring-template edit body + footer (used by expense list & transactions). */
export function ExpenseEditForm({
  row,
  onDone,
}: {
  row: ExpenseRow;
  onDone: () => void;
}) {
  const t = useTranslations("expense");
  const tC = useTranslations("common");
  const save = useUpdateExpense(onDone);
  const [title, setTitle] = useState(row.title);
  const [amount, setAmount] = useState(String(row.amount));
  const [cat, setCat] = useState(row.category);
  const [date, setDate] = useState(
    toLocalYmd(row.displayDate ? new Date(row.displayDate) : new Date(row.date)),
  );
  const [vf, setVf] = useState(
    row.isTemplate ? toLocalYmd(new Date(row.validFrom!)) : date,
  );
  const [vt, setVt] = useState(row.validTo ? toLocalYmd(new Date(row.validTo)) : "");
  const [dueDay, setDueDay] = useState(
    String(
      row.dueDayOfMonth ??
        Math.min(30, Math.max(1, new Date(row.validFrom!).getUTCDate())),
    ),
  );
  const [projectName, setProjectName] = useState(row.projectName?.trim() ?? "");

  return (
    <>
      {row.isTemplate ? (
        <div className="flex flex-col gap-3">
          <div>
            <Label>{tC("title")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>{t("formAmountPerMonth")}</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-cat-rec">{tC("category")}</Label>
            <ExpenseCategoryField
              id="edit-cat-rec"
              value={cat}
              onCategoryChange={setCat}
              className="h-11 w-full"
            />
          </div>
          <div>
            <Label>{t("table.from")}</Label>
            <Input type="date" value={vf} onChange={(e) => setVf(e.target.value)} />
          </div>
          <div>
            <Label>{t("endOpt")}</Label>
            <Input type="date" value={vt} onChange={(e) => setVt(e.target.value)} />
          </div>
          <div>
            <Label htmlFor={`edit-due-${row._id}`}>{t("dueDayOfMonth")}</Label>
            <p className="mb-1 text-xs text-muted-foreground">{t("dueDayOfMonthHelp")}</p>
            <Input
              id={`edit-due-${row._id}`}
              type="number"
              min={1}
              max={30}
              className="h-11 w-full"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
            />
          </div>
          <ProjectSpendField
            id={`edit-proj-rec-${row._id}`}
            value={projectName}
            onChange={setProjectName}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div>
            <Label>{tC("title")}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <Label>{tC("amount")}</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="edit-cat">{tC("category")}</Label>
            <ExpenseCategoryField
              id="edit-cat"
              value={cat}
              onCategoryChange={setCat}
              className="h-11 w-full"
            />
          </div>
          <div>
            <Label>{tC("date")}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <ProjectSpendField
            id={`edit-proj-${row._id}`}
            value={projectName}
            onChange={setProjectName}
          />
        </div>
      )}
      <DialogFooter className="mt-4">
        <Button type="button" onClick={onDone} variant="outline" disabled={save.isPending}>
          {tC("close")}
        </Button>
        <Button
          type="button"
          onClick={() =>
            save.mutate({
              row,
              values: {
                title,
                amount: parseFloat(amount),
                category: cat,
                date,
                validFrom: vf,
                validTo: vt,
                projectName,
                dueDayOfMonth: Math.min(30, Math.max(1, Math.round(parseFloat(dueDay)) || 1)),
              },
            })
          }
          disabled={save.isPending}
        >
          {save.isPending ? (
            <>
              <Loader2 className="me-2 size-4 animate-spin" />
              {tC("saving")}
            </>
          ) : (
            tC("save")
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
