"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { PageHeader } from "@/components/ui/page-header";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ExpenseCategoryField } from "@/components/expense/expense-category-field";
import { ProjectSpendField } from "@/components/expense/project-spend-field";
import { PaymentMethodField } from "@/components/forms/payment-method-field";
import { Receipt, CalendarClock, Repeat } from "lucide-react";
import { useNewExpenseForm } from "@/features/expenses/hooks/use-new-expense-form";

const field = "h-11 w-full min-w-0";
const label = "text-xs font-medium text-muted-foreground leading-none";
const formGrid = "grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4";
const helperClass =
  "min-h-4 text-[0.7rem] leading-snug text-muted-foreground sm:text-xs";
const actionRowClass =
  "sm:col-span-2 flex flex-col-reverse gap-2 pt-1 min-[420px]:flex-row";

function FieldCol({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      {children}
    </div>
  );
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

export function NewExpenseFormFields({
  onCancel,
  onSuccess,
}: {
  onCancel: () => void;
  onSuccess?: () => void;
}) {
  const t = useTranslations("expense");
  const tC = useTranslations("common");
  const f = useNewExpenseForm({ onDone: onSuccess ?? onCancel });

  return (
    <Tabs defaultValue="variable" className="w-full">
      <div className="pb-3">
        <TabsList
          className="!h-auto !w-full min-w-0 flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/50 p-1.5 sm:flex-row"
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

          <div>
            <TabsContent value="variable" className="mt-0">
              <p className="mb-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {t("varDayIntro")}
              </p>
              <div className={formGrid}>
                <FieldCol>
                  <FieldLabel htmlFor="v-cat">{tC("category")}</FieldLabel>
                  <ExpenseCategoryField
                    id="v-cat"
                    value={f.variable.cat}
                    onCategoryChange={f.variable.setCat}
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
                    value={f.variable.amount}
                    onChange={(e) => f.variable.setAmount(e.target.value)}
                  />
                </FieldCol>
                <FieldCol className="sm:col-span-2">
                  <FieldLabel htmlFor="v-title" helper={t("varReasonHelp")}>
                    {t("varReason")}
                  </FieldLabel>
                  <Input
                    id="v-title"
                    className={field}
                    value={f.variable.title}
                    onChange={(e) => f.variable.setTitle(e.target.value)}
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
                    value={f.variable.date}
                    onChange={(e) => f.variable.setDate(e.target.value)}
                  />
                </FieldCol>
                <ProjectSpendField
                  id="v-proj"
                  className="sm:col-span-2"
                  value={f.variable.projectName}
                  onChange={f.variable.setProjectName}
                />
                <FieldCol className="sm:col-span-2">
                  <PaymentMethodField
                    value={f.variable.paymentMethod}
                    onChange={f.variable.setPaymentMethod}
                  />
                </FieldCol>
                <div className={actionRowClass}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full touch-manipulation min-[420px]:w-auto"
                    onClick={onCancel}
                  >
                    {tC("cancel")}
                  </Button>
                  <Button
                    type="button"
                    className="h-11 w-full touch-manipulation min-[420px]:w-auto"
                    onClick={f.variable.submit}
                    disabled={!f.variable.title || !f.variable.amount || f.mVar.isPending}
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
                    value={f.fixed.title}
                    onChange={(e) => f.fixed.setTitle(e.target.value)}
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
                    value={f.fixed.amount}
                    onChange={(e) => f.fixed.setAmount(e.target.value)}
                  />
                </FieldCol>
                <FieldCol>
                  <FieldLabel htmlFor="f-cat">{tC("category")}</FieldLabel>
                  <ExpenseCategoryField
                    id="f-cat"
                    value={f.fixed.cat}
                    onCategoryChange={f.fixed.setCat}
                    className={field}
                  />
                </FieldCol>
                <FieldCol className="sm:col-span-2">
                  <FieldLabel htmlFor="f-date">{t("dateInMonth")}</FieldLabel>
                  <Input
                    id="f-date"
                    className={field}
                    type="date"
                    value={f.fixed.date}
                    onChange={(e) => f.fixed.setDate(e.target.value)}
                  />
                </FieldCol>
                <ProjectSpendField
                  id="f-proj"
                  className="sm:col-span-2"
                  value={f.fixed.projectName}
                  onChange={f.fixed.setProjectName}
                />
                <FieldCol className="sm:col-span-2">
                  <PaymentMethodField
                    value={f.fixed.paymentMethod}
                    onChange={f.fixed.setPaymentMethod}
                  />
                </FieldCol>
                <div className={actionRowClass}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full touch-manipulation min-[420px]:w-auto"
                    onClick={onCancel}
                  >
                    {tC("cancel")}
                  </Button>
                  <Button
                    type="button"
                    className="h-11 w-full touch-manipulation min-[420px]:w-auto"
                    onClick={f.fixed.submit}
                    disabled={!f.fixed.title || !f.fixed.amount || f.mFix.isPending}
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
                    value={f.recurring.title}
                    onChange={(e) => f.recurring.setTitle(e.target.value)}
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
                    value={f.recurring.amount}
                    onChange={(e) => f.recurring.setAmount(e.target.value)}
                  />
                </FieldCol>
                <FieldCol>
                  <FieldLabel htmlFor="r-cat">{tC("category")}</FieldLabel>
                  <ExpenseCategoryField
                    id="r-cat"
                    value={f.recurring.cat}
                    onCategoryChange={f.recurring.setCat}
                    className={field}
                  />
                </FieldCol>
                <FieldCol>
                  <FieldLabel htmlFor="r-from" helper={t("recFromHelp")}>
                    {t("table.from")}
                  </FieldLabel>
                  <Input
                    id="r-from"
                    className={field}
                    type="date"
                    value={f.recurring.from}
                    onChange={(e) => f.recurring.setFrom(e.target.value)}
                  />
                </FieldCol>
                <FieldCol>
                  <FieldLabel htmlFor="r-to">{t("endOpt")}</FieldLabel>
                  <Input
                    id="r-to"
                    className={field}
                    type="date"
                    value={f.recurring.to}
                    onChange={(e) => f.recurring.setTo(e.target.value)}
                  />
                </FieldCol>
                <FieldCol>
                  <FieldLabel htmlFor="r-due" helper={t("dueDayOfMonthHelp")}>
                    {t("dueDayOfMonth")}
                  </FieldLabel>
                  <Input
                    id="r-due"
                    className={field}
                    type="number"
                    min={1}
                    max={30}
                    value={f.recurring.dueDay}
                    onChange={(e) => f.recurring.setDueDay(e.target.value)}
                  />
                </FieldCol>
                <ProjectSpendField
                  id="r-proj"
                  className="sm:col-span-2"
                  value={f.recurring.projectName}
                  onChange={f.recurring.setProjectName}
                />
                <FieldCol className="sm:col-span-2">
                  <PaymentMethodField
                    value={f.recurring.paymentMethod}
                    onChange={f.recurring.setPaymentMethod}
                  />
                </FieldCol>
                <div className={actionRowClass}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 w-full touch-manipulation min-[420px]:w-auto"
                    onClick={onCancel}
                  >
                    {tC("cancel")}
                  </Button>
                  <Button
                    type="button"
                    className="h-11 w-full touch-manipulation min-[420px]:w-auto"
                    onClick={f.recurring.submit}
                    disabled={!f.recurring.title || !f.recurring.amount || f.mRec.isPending}
                  >
                    {t("saveRec")}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
  );
}

export function NewExpenseForm() {
  const t = useTranslations("expense");
  const f = useNewExpenseForm();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader title={t("newTitle")} description={t("newDesc")} />

      <section
        className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm"
        aria-labelledby="expense-type-heading"
      >
        <div className="border-b border-border/60 bg-gradient-to-b from-muted/30 to-transparent px-4 py-4 sm:px-5">
          <h2 id="expense-type-heading" className="text-sm font-semibold sm:text-base">
            {t("typeCardT")}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t("typeCardD")}
          </p>
          <p className="mt-2 border-t border-border/50 pt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t("categoryHint")}
          </p>
        </div>

        <div className="p-4 sm:p-5">
          <NewExpenseFormFields onCancel={() => f.router.back()} />
        </div>
      </section>
    </div>
  );
}
