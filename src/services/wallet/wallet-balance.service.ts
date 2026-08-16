import prisma from "../../utils/prisma.js";

const FUNDED_ACTIVE_STATUSES = ["ONGOING", "PENDING_CLOSURE", "DISPUTE"] as const;

export type CurrencyAmounts = { NGN: number; USD: number };

export type WalletBalances = {
  available: CurrencyAmounts;
  locked: CurrencyAmounts;
};

function toNumber(value: { toNumber?: () => number } | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value.toNumber === "function") return value.toNumber();
  return Number(value);
}

function computeLockedAmount(transaction: {
  amount: number;
  transactionType: string;
  milestones: Array<{ amount: number; status: string }>;
}): number {
  if (transaction.transactionType === "MILESTONE_BASED_PROJECT") {
    return transaction.milestones
      .filter((m) => m.status !== "COMPLETED" && m.status !== "CANCELED")
      .reduce((sum, m) => sum + m.amount, 0);
  }
  return transaction.amount;
}

function addToBucket(bucket: CurrencyAmounts, currency: string, amount: number) {
  if (currency === "USD") {
    bucket.USD += amount;
  } else {
    bucket.NGN += amount;
  }
}

/**
 * Returns the authenticated user's available withdrawable wallet balances
 * and locked escrow principal, broken down by NGN and USD.
 */
export async function getWalletBalancesService(userId: number): Promise<WalletBalances> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      walletBalanceNGN: true,
      walletBalanceUSD: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const fundedActiveTransactions = await prisma.transaction.findMany({
    where: {
      OR: [{ creator_email: user.email }, { reciever_email: user.email }],
      status: { in: [...FUNDED_ACTIVE_STATUSES] },
      payment: { is: { status: "COMPLETED" } },
    },
    select: {
      amount: true,
      currency: true,
      transactionType: true,
      milestones: {
        select: { amount: true, status: true },
      },
    },
  });

  const locked: CurrencyAmounts = { NGN: 0, USD: 0 };
  for (const txn of fundedActiveTransactions) {
    addToBucket(locked, txn.currency, computeLockedAmount(txn));
  }

  return {
    available: {
      NGN: toNumber(user.walletBalanceNGN),
      USD: toNumber(user.walletBalanceUSD),
    },
    locked,
  };
}
