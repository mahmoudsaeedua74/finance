"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useMutation } from "@tanstack/react-query";
import { useFinanceInvalidation } from "@/hooks/use-finance-invalidation";
import { PageHeader } from "@/components/ui/page-header";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { jsonFetch } from "@/lib/fetcher";
import { toast } from "sonner";
import { useMonth } from "@/context/month-context";
import { cn } from "@/lib/utils";
import { resolveExpenseCategoryForSave } from "@/lib/expense-categories";
import { ExpenseCategoryField } from "@/components/expense/expense-category-field";
import { Receipt, CalendarClock, Repeat } from "lucide-react";

const field = "h-11 w-full min-w-0";
const label = "text-xs font-medium text-muted-foreground leading-none";
const formGrid = "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4";
const helperClass = "min-h-4 text-[0.7rem] leading-snug text-muted-foreground sm:text-xs";
const actionRowClass = "sm:col-span-2 flex flex-col-reverse gap-2 pt-1 min-[420px]:flex-row";

function FieldCol({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex min-w-0 flex-col gap-2", className)}>{children}</div>;
}

function FieldLabel({
  htmlFor,
  children,
  helper,
}: {
  htmlFor: string;
  children: ReactNode;
  helper?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} className={label}>
        {children}
      </Label>
      <p className={helperClass}>{helper ?? <span aria-hidden>&nbsp;</span>}</p>
    </div>
  );
}

export default function NewExpensePage() {
  const t = useTranslations("expense");
  const tC = useTranslations("common");
  const router = useRouter();
  const { invalidateExpenses } = useFinanceInvalidation();
  const { year, month } = useMonth();
  const defDate = new Date(year, month - 1, 10).toISOString().slice(0, 10);

  const [varTitle, setVarTitle] = useState("");
  const [varAmount, setVarAmount] = useState("");
  const [varCat, setVarCat] = useState("general");
  const [varDate, setVarDate] = useState(defDate);

  const [fixTitle, setFixTitle] = useState("");
  const [fixAmount, setFixAmount] = useState("");
  const [fixCat, setFixCat] = useState("subscription");
  const [fixDate, setFixDate] = useState(defDate);

  const [recTitle, setRecTitle] = useState("");
  const [recAmount, setRecAmount] = useState("");
  const [recCat, setRecCat] = useState("employee");
  const [recFrom, setRecFrom] = useState(
    new Date(year, month - 1, 1).toISOString().slice(0, 10)
  );
  const [recTo, setRecTo] = useState("");

  const mVar = useMutation({
    mutationFn: () =>
      jsonFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          title: varTitle,
          amount: parseFloat(varAmount),
          category: resolveExpenseCategoryForSave(varCat),
          kind: "variable",
          date: new Date(varDate).toISOString(),
        }),
      }),
    onSuccess: () => {
      toast.success(t("savedV"));
      invalidateExpenses();
      router.push("/expense");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mFix = useMutation({
    mutationFn: () =>
      jsonFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          title: fixTitle,
          amount: parseFloat(fixAmount),
          category: resolveExpenseCategoryForSave(fixCat),
          kind: "fixed",
          date: new Date(fixDate).toISOString(),
        }),
      }),
    onSuccess: () => {
      toast.success(t("savedF"));
      invalidateExpenses({ includeAllList: true });
      router.push("/expense");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mRec = useMutation({
    mutationFn: () =>
      jsonFetch("/api/expenses", {
        method: "POST",
        body: JSON.stringify({
          title: recTitle,
          amount: parseFloat(recAmount),
          category: resolveExpenseCategoryForSave(recCat),
          isTemplate: true,
          recurring: true,
          validFrom: new Date(recFrom).toISOString(),
          validTo: recTo ? new Date(recTo).toISOString() : null,
        }),
      }),
    onSuccess: () => {
      toast.success(t("savedR"));
      invalidateExpenses({ includeAllList: true });
      router.push("/expense");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeader title={t("newTitle")} description={t("newDesc")} />

      <section
        className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-md"
        aria-labelledby="expense-type-heading"
      >
        <div
          className="border-b border-border/60 bg-gradient-to-b from-muted/30 to-transparent px-4 py-4 sm:px-5"
        >
          <h2
            id="expense-type-heading"
            className="text-sm font-semibold sm:text-base"
          >
            {t("typeCardT")}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t("typeCardD")}
          </p>
          <p className="mt-2 border-t border-border/50 pt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t("categoryHint")}
          </p>
        </div>

        <Tabs defaultValue="variable" className="w-full">
          <div className="p-4 sm:p-5 sm:pt-4">
            <TabsList
              className="!h-auto !w-full min-w-0  flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/50 p-1.5"
              aria-label={t("typeCardT")}
            >
              <TabsTrigger
                value="variable"
                className="min-h-11 flex-1 flex-col gap-0.5 rounded-lg px-1.5 py-1.5 text-center text-[10px] font-medium leading-tight data-active:shadow sm:flex-row sm:gap-1.5 sm:px-2 sm:py-2 sm:text-xs"
              >
                <Receipt className="size-3.5 shrink-0 sm:size-3.5" aria-hidden />
                <span className="line-clamp-2 sm:line-clamp-1">{t("tabVar")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="onetime"
                className="min-h-11 flex-1 flex-col gap-0.5 rounded-lg px-1.5 py-1.5 text-center text-[10px] font-medium leading-tight data-active:shadow sm:flex-row sm:gap-1.5 sm:px-2 sm:py-2 sm:text-xs"
              >
                <CalendarClock className="size-3.5 shrink-0" aria-hidden />
                <span className="line-clamp-2 sm:line-clamp-1">{t("tabFix")}</span>
              </TabsTrigger>
              <TabsTrigger
                value="recurring"
                className="min-h-11 flex-1 flex-col gap-0.5 rounded-lg px-1.5 py-1.5 text-center text-[10px] font-medium leading-tight data-active:shadow sm:flex-row sm:gap-1.5 sm:px-2 sm:py-2 sm:text-xs"
              >
                <Repeat className="size-3.5 shrink-0" aria-hidden />
                <span className="line-clamp-2 sm:line-clamp-1">{t("tabRec")}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-4 sm:p-5 sm:pt-4">
            <TabsContent value="variable" className="mt-0">
              <p className="mb-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {t("varDayIntro")}
              </p>
              <div className={formGrid}>
                <FieldCol>
                  <FieldLabel htmlFor="v-cat">{tC("category")}</FieldLabel>
                  <ExpenseCategoryField
                    id="v-cat"
                    value={varCat}
                    onCategoryChange={setVarCat}
                    className={field}
                  />
                </FieldCol>
                <FieldCol>
                  <FieldLabel htmlFor="v-amt">{tC("amount")}</FieldLabel>
                  <Input
                    id="v-amt"
                    className={field}
                    type="number"
                    step="0.01"
                    value={varAmount}
                    onChange={(e) => setVarAmount(e.target.value)}
                  />
                </FieldCol>
                <FieldCol className="sm:col-span-2">
                  <FieldLabel htmlFor="v-title" helper={t("varReasonHelp")}>
                    {t("varReason")}
                  </FieldLabel>
                  <Input
                    id="v-title"
                    className={field}
                    value={varTitle}
                    onChange={(e) => setVarTitle(e.target.value)}
                    placeholder={t("varReasonPh")}
                    autoComplete="off"
                  />
                </FieldCol>
                <FieldCol className="sm:col-span-2">
                  <FieldLabel htmlFor="v-date">{tC("date")}</FieldLabel>
                  <Input
                    id="v-date"
                    className={field}
                    type="date"
                    value={varDate}
                    onChange={(e) => setVarDate(e.target.value)}
                  />
                </FieldCol>
                <div className={actionRowClass}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full touch-manipulation min-[420px]:w-auto"
                    onClick={() => router.back()}
                  >
                    {tC("cancel")}
                  </Button>
                  <Button
                    type="button"
                    className="h-11 w-full touch-manipulation min-[420px]:w-auto"
                    onClick={() => mVar.mutate()}
                    disabled={!varTitle || !varAmount}
                  >
                    {t("saveVar")}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="onetime" className="mt-0">
              <div className={formGrid}>
                <FieldCol className="sm:col-span-2">
                  <FieldLabel htmlFor="f-title">{tC("title")}</FieldLabel>
                  <Input
                    id="f-title"
                    className={field}
                    value={fixTitle}
                    onChange={(e) => setFixTitle(e.target.value)}
                    placeholder={t("phFixT")}
                  />
                </FieldCol>
                <FieldCol>
                  <FieldLabel htmlFor="f-amt">{tC("amount")}</FieldLabel>
                  <Input
                    id="f-amt"
                    className={field}
                    type="number"
                    step="0.01"
                    value={fixAmount}
                    onChange={(e) => setFixAmount(e.target.value)}
                  />
                </FieldCol>
                <FieldCol>
                  <FieldLabel htmlFor="f-cat">{tC("category")}</FieldLabel>
                  <ExpenseCategoryField
                    id="f-cat"
                    value={fixCat}
                    onCategoryChange={setFixCat}
                    className={field}
                  />
                </FieldCol>
                <FieldCol className="sm:col-span-2">
                  <FieldLabel htmlFor="f-date">{t("dateInMonth")}</FieldLabel>
                  <Input
                    id="f-date"
                    className={field}
                    type="date"
                    value={fixDate}
                    onChange={(e) => setFixDate(e.target.value)}
                  />
                </FieldCol>
                <div className={actionRowClass}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full touch-manipulation min-[420px]:w-auto"
                    onClick={() => router.back()}
                  >
                    {tC("cancel")}
                  </Button>
                  <Button
                    type="button"
                    className="h-11 w-full touch-manipulation min-[420px]:w-auto"
                    onClick={() => mFix.mutate()}
                    disabled={!fixTitle || !fixAmount}
                  >
                    {t("saveFix")}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recurring" className="mt-0">
              <p className="mb-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {t("recHelp")}
              </p>
              <div className={formGrid}>
                <FieldCol className="sm:col-span-2">
                  <FieldLabel htmlFor="r-title">{tC("title")}</FieldLabel>
                  <Input
                    id="r-title"
                    className={field}
                    value={recTitle}
                    onChange={(e) => setRecTitle(e.target.value)}
                    placeholder={t("phRecT")}
                  />
                </FieldCol>
                <FieldCol>
                  <FieldLabel htmlFor="r-amt">{t("formAmountPerMonth")}</FieldLabel>
                  <Input
                    id="r-amt"
                    className={field}
                    type="number"
                    step="0.01"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                  />
                </FieldCol>
                <FieldCol>
                  <FieldLabel htmlFor="r-cat">{tC("category")}</FieldLabel>
                  <ExpenseCategoryField
                    id="r-cat"
                    value={recCat}
                    onCategoryChange={setRecCat}
                    className={field}
                  />
                </FieldCol>
                <FieldCol>
                  <FieldLabel htmlFor="r-from">{t("table.from")}</FieldLabel>
                  <Input
                    id="r-from"
                    className={field}
                    type="date"
                    value={recFrom}
                    onChange={(e) => setRecFrom(e.target.value)}
                  />
                </FieldCol>
                <FieldCol>
                  <FieldLabel htmlFor="r-to">{t("endOpt")}</FieldLabel>
                  <Input
                    id="r-to"
                    className={field}
                    type="date"
                    value={recTo}
                    onChange={(e) => setRecTo(e.target.value)}
                  />
                </FieldCol>
                <div className={actionRowClass}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full touch-manipulation min-[420px]:w-auto"
                    onClick={() => router.back()}
                  >
                    {tC("cancel")}
                  </Button>
                  <Button
                    type="button"
                    className="h-11 w-full touch-manipulation min-[420px]:w-auto"
                    onClick={() => mRec.mutate()}
                    disabled={!recTitle || !recAmount}
                  >
                    {t("saveRec")}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </section>
    </div>
  );
}
