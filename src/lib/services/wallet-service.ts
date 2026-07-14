import mongoose from "mongoose";
import { Expense, Income, Project, UserWallet } from "@/lib/models";
import { isWalletPaymentMethod } from "@/lib/payment-method";
import type { WalletSummary } from "@/types/wallet";

export type { WalletSummary };

function sumByMethod(
  rows: { amount: number; paymentMethod?: string | null }[],
  method: "cash" | "card",
  sign: 1 | -1
) {
  return rows.reduce((s, r) => {
    if (r.paymentMethod !== method) return s;
    return s + sign * r.amount;
  }, 0);
}

/** Legacy payouts without `isCollected` are treated as collected. */
function collectedPayoutMatch(userId: string) {
  return {
    userId: new mongoose.Types.ObjectId(userId),
    $or: [{ isCollected: true }, { isCollected: { $exists: false } }],
  };
}

export async function computeWalletSummary(userId: string): Promise<WalletSummary> {
  const uid = new mongoose.Types.ObjectId(userId);
  const [wallet, incomes, expenses, payouts] = await Promise.all([
    UserWallet.findOne({ userId: uid }).lean(),
    Income.find({ userId: uid }).select("amount paymentMethod").lean(),
    Expense.find({ userId: uid, isTemplate: false }).select("amount paymentMethod").lean(),
    Project.find(collectedPayoutMatch(userId)).select("amount paymentMethod").lean(),
  ]);

  const openingCash = wallet?.openingCash ?? 0;
  const openingCard = wallet?.openingCard ?? 0;

  const incomeCash = sumByMethod(incomes, "cash", 1);
  const incomeCard = sumByMethod(incomes, "card", 1);
  const expenseCash = sumByMethod(expenses, "cash", -1);
  const expenseCard = sumByMethod(expenses, "card", -1);
  const payoutCash = sumByMethod(payouts, "cash", 1);
  const payoutCard = sumByMethod(payouts, "card", 1);

  const cashFromTransactions = incomeCash + payoutCash + expenseCash;
  const cardFromTransactions = incomeCard + payoutCard + expenseCard;
  const cashBalance = openingCash + cashFromTransactions;
  const cardBalance = openingCard + cardFromTransactions;

  return {
    openingCash,
    openingCard,
    cashFromTransactions,
    cardFromTransactions,
    cashBalance,
    cardBalance,
    totalBalance: cashBalance + cardBalance,
  };
}

export async function upsertWalletOpening(
  userId: string,
  input: { openingCash?: number; openingCard?: number }
) {
  const uid = new mongoose.Types.ObjectId(userId);
  const update: { openingCash?: number; openingCard?: number } = {};
  if (input.openingCash != null && Number.isFinite(input.openingCash)) {
    update.openingCash = Math.max(0, Number(input.openingCash));
  }
  if (input.openingCard != null && Number.isFinite(input.openingCard)) {
    update.openingCard = Math.max(0, Number(input.openingCard));
  }
  const doc = await UserWallet.findOneAndUpdate(
    { userId: uid },
    { $set: update, $setOnInsert: { userId: uid } },
    { upsert: true, new: true }
  );
  return doc;
}

/** Set what the user has right now; opening balance is derived from movements. */
export async function setWalletCurrentBalances(
  userId: string,
  input: { cashBalance: number; cardBalance: number }
): Promise<WalletSummary> {
  const cashTarget = Math.max(0, Number(input.cashBalance) || 0);
  const cardTarget = Math.max(0, Number(input.cardBalance) || 0);
  const uid = new mongoose.Types.ObjectId(userId);

  const [incomes, expenses, payouts] = await Promise.all([
    Income.find({ userId: uid }).select("amount paymentMethod").lean(),
    Expense.find({ userId: uid, isTemplate: false }).select("amount paymentMethod").lean(),
    Project.find(collectedPayoutMatch(userId)).select("amount paymentMethod").lean(),
  ]);

  const cashFromTx =
    sumByMethod(incomes, "cash", 1) +
    sumByMethod(payouts, "cash", 1) +
    sumByMethod(expenses, "cash", -1);
  const cardFromTx =
    sumByMethod(incomes, "card", 1) +
    sumByMethod(payouts, "card", 1) +
    sumByMethod(expenses, "card", -1);

  await upsertWalletOpening(userId, {
    openingCash: cashTarget - cashFromTx,
    openingCard: cardTarget - cardFromTx,
  });

  return computeWalletSummary(userId);
}

export function paymentMethodAffectsWallet(m: string | undefined | null): boolean {
  return isWalletPaymentMethod(m as "cash" | "card" | "unspecified" | undefined);
}
