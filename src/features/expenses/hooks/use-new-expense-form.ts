"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { defaultFormDateYmd } from "@/lib/ymd";
import { resolveExpenseCategoryForSave } from "@/lib/expense-categories";
import { useCreateExpenseFormMutations } from "@/features/expenses/hooks";
import type { PaymentMethod } from "@/lib/payment-method";

export function useNewExpenseForm(opts?: { onDone?: () => void }) {
  const t = useTranslations("expense");
  const router = useRouter();
  const onDone = opts?.onDone ?? (() => router.push("/expense"));
  const { mVar, mFix, mRec } = useCreateExpenseFormMutations({
    onDone,
    tSaved: { v: t("savedV"), f: t("savedF"), r: t("savedR") },
  });

  const [varTitle, setVarTitle] = useState("");
  const [varAmount, setVarAmount] = useState("");
  const [varCat, setVarCat] = useState("general");
  const [varDate, setVarDate] = useState(() => defaultFormDateYmd());
  const [varProjectName, setVarProjectName] = useState("");
  const [varPaymentMethod, setVarPaymentMethod] = useState<PaymentMethod>("unspecified");

  const [fixTitle, setFixTitle] = useState("");
  const [fixAmount, setFixAmount] = useState("");
  const [fixCat, setFixCat] = useState("subscription");
  const [fixDate, setFixDate] = useState(() => defaultFormDateYmd());
  const [fixProjectName, setFixProjectName] = useState("");
  const [fixPaymentMethod, setFixPaymentMethod] = useState<PaymentMethod>("unspecified");

  const [recTitle, setRecTitle] = useState("");
  const [recAmount, setRecAmount] = useState("");
  const [recCat, setRecCat] = useState("employee");
  const [recProjectName, setRecProjectName] = useState("");
  const [recPaymentMethod, setRecPaymentMethod] = useState<PaymentMethod>("unspecified");
  const [recFrom, setRecFrom] = useState(() => defaultFormDateYmd());
  const [recTo, setRecTo] = useState("");
  const [recDueDay, setRecDueDay] = useState(() =>
    String(Math.min(30, Math.max(1, new Date().getDate())))
  );

  const submitVariable = () =>
    mVar.mutate({
      title: varTitle,
      amount: parseFloat(varAmount),
      category: resolveExpenseCategoryForSave(varCat),
      date: new Date(varDate).toISOString(),
      paymentMethod: varPaymentMethod,
      ...(varProjectName.trim() ? { projectName: varProjectName } : {}),
    });

  const submitFixed = () =>
    mFix.mutate({
      title: fixTitle,
      amount: parseFloat(fixAmount),
      category: resolveExpenseCategoryForSave(fixCat),
      date: new Date(fixDate).toISOString(),
      paymentMethod: fixPaymentMethod,
      ...(fixProjectName.trim() ? { projectName: fixProjectName } : {}),
    });

  const submitRecurring = () =>
    mRec.mutate({
      title: recTitle,
      amount: parseFloat(recAmount),
      category: resolveExpenseCategoryForSave(recCat),
      isTemplate: true,
      recurring: true,
      validFrom: new Date(recFrom).toISOString(),
      validTo: recTo ? new Date(recTo).toISOString() : null,
      dueDayOfMonth: Math.min(30, Math.max(1, Math.round(parseFloat(recDueDay)) || 10)),
      paymentMethod: recPaymentMethod,
      ...(recProjectName.trim() ? { projectName: recProjectName } : {}),
    });

  return {
    router,
    mVar,
    mFix,
    mRec,
    variable: {
      title: varTitle,
      amount: varAmount,
      cat: varCat,
      date: varDate,
      projectName: varProjectName,
      paymentMethod: varPaymentMethod,
      setTitle: setVarTitle,
      setAmount: setVarAmount,
      setCat: setVarCat,
      setDate: setVarDate,
      setProjectName: setVarProjectName,
      setPaymentMethod: setVarPaymentMethod,
      submit: submitVariable,
    },
    fixed: {
      title: fixTitle,
      amount: fixAmount,
      cat: fixCat,
      date: fixDate,
      projectName: fixProjectName,
      paymentMethod: fixPaymentMethod,
      setTitle: setFixTitle,
      setAmount: setFixAmount,
      setCat: setFixCat,
      setDate: setFixDate,
      setProjectName: setFixProjectName,
      setPaymentMethod: setFixPaymentMethod,
      submit: submitFixed,
    },
    recurring: {
      title: recTitle,
      amount: recAmount,
      cat: recCat,
      projectName: recProjectName,
      paymentMethod: recPaymentMethod,
      from: recFrom,
      to: recTo,
      dueDay: recDueDay,
      setTitle: setRecTitle,
      setAmount: setRecAmount,
      setCat: setRecCat,
      setProjectName: setRecProjectName,
      setPaymentMethod: setRecPaymentMethod,
      setFrom: setRecFrom,
      setTo: setRecTo,
      setDueDay: setRecDueDay,
      submit: submitRecurring,
    },
  };
}
