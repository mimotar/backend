import prisma from "../../utils/prisma.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { Role } from "../../generated/prisma/enums.js";

const FUNDED_ACTIVE_STATUSES = ["ONGOING", "PENDING_CLOSURE", "DISPUTE"] as const;
const ACTIVE_CONTRACT_STATUSES = [
  "CREATED",
  "APPROVED",
  "CHANGES_REQUESTED",
  "ONGOING",
  "PENDING_CLOSURE",
  "DISPUTE",
] as const;

const ACTION_PRIORITY: Record<string, number> = {
  APPROVE_OR_REJECT_CANCEL: 1,
  RESPOND_TO_DISPUTE: 2,
  ACCEPT_OR_REJECT_CLOSURE: 3,
  PAY_ESCROW: 4,
  APPROVE_OR_REJECT: 5,
  REVISE_AND_RESUBMIT: 6,
};

type CurrencyBucket = { NGN: number; USD: number };

type Counterparty = { name: string; email: string };

type ActionItem = {
  type: string;
  transactionId: number;
  title: string;
  amount: number;
  currency: string;
  status: string;
  from: Counterparty;
  createdAt: string;
  fundStatus: "FUNDED" | "UNFUNDED";
  deliveredAndReleasedStatus: "NOT_DELIVERED" | "DELIVERED" | "RELEASED";
  roleStatus: Role;
};

function toNumber(value: { toNumber?: () => number } | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value.toNumber === "function") return value.toNumber();
  return Number(value);
}

function getCounterparty(
  transaction: {
    creator_email: string;
    creator_fullname: string;
    reciever_email: string;
    receiver_fullname: string;
    user_id?: number | null;
  },
  userEmail: string,
  userId?: number
): Counterparty {
  if (userId && transaction.user_id === userId) {
    return { name: transaction.receiver_fullname, email: transaction.reciever_email };
  }
  const isCreator = transaction.creator_email.toLowerCase() === userEmail.toLowerCase();
  return isCreator
    ? { name: transaction.receiver_fullname, email: transaction.reciever_email }
    : { name: transaction.creator_fullname, email: transaction.creator_email };
}

function isBuyer(
  transaction: { creator_role: Role; creator_email: string; reciever_email: string; user_id?: number | null },
  userEmail: string,
  userId?: number
): boolean {
  const isCreator = (userId && transaction.user_id === userId) || transaction.creator_email.toLowerCase() === userEmail.toLowerCase();
  if (transaction.creator_role === "CLIENT") {
    return isCreator;
  }
  return !isCreator;
}

function getUserRole(
  transaction: {
    creator_email: string;
    creator_role: Role;
    reciever_email: string;
    reciever_role: Role;
    user_id?: number | null;
  },
  userEmail: string,
  userId?: number
): Role {
  if (userId && transaction.user_id === userId) {
    return transaction.creator_role;
  }
  const isCreator = transaction.creator_email.toLowerCase() === userEmail.toLowerCase();
  return isCreator ? transaction.creator_role : transaction.reciever_role;
}

function getFundStatus(payment: { status: string } | null | undefined): "FUNDED" | "UNFUNDED" {
  return payment?.status === "COMPLETED" ? "FUNDED" : "UNFUNDED";
}

function getDeliveredAndReleasedStatus(
  status: string
): "NOT_DELIVERED" | "DELIVERED" | "RELEASED" {
  if (status === "COMPLETED") return "RELEASED";
  if (status === "PENDING_CLOSURE") return "DELIVERED";
  return "NOT_DELIVERED";
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

function addToBucket(bucket: CurrencyBucket, currency: string, amount: number) {
  if (currency === "USD") {
    bucket.USD += amount;
  } else {
    bucket.NGN += amount;
  }
}

function buildActionsForUser(
  userEmail: string,
  transactions: Array<{
    id: number;
    title: string;
    amount: number;
    currency: string;
    status: string;
    created_at: Date;
    user_id?: number | null;
    creator_email: string;
    creator_fullname: string;
    creator_role: Role;
    reciever_email: string;
    receiver_fullname: string;
    reciever_role: Role;
    cancel_requested_by_email: string | null;
    payment: { status: string } | null;
  }>,
  openDisputes: Array<{
    id: number;
    transactionId: number;
    transaction: {
      id: number;
      title: string;
      amount: number;
      currency: string;
      status: string;
      created_at: Date;
      user_id?: number | null;
      creator_email: string;
      creator_fullname: string;
      creator_role: Role;
      reciever_email: string;
      receiver_fullname: string;
      reciever_role: Role;
      payment: { status: string } | null;
    };
  }>,
  userId?: number
): ActionItem[] {
  const email = userEmail.toLowerCase();
  const actions: ActionItem[] = [];

  for (const dispute of openDisputes) {
    const txn = dispute.transaction;
    actions.push({
      type: "RESPOND_TO_DISPUTE",
      transactionId: txn.id,
      title: txn.title || `Dispute on transaction #${txn.id}`,
      amount: txn.amount,
      currency: txn.currency,
      status: txn.status,
      from: getCounterparty(txn, userEmail, userId),
      createdAt: txn.created_at.toISOString(),
      fundStatus: getFundStatus(txn.payment),
      deliveredAndReleasedStatus: getDeliveredAndReleasedStatus(txn.status),
      roleStatus: getUserRole(txn, userEmail, userId),
    });
  }

  for (const txn of transactions) {
    const isCreator = (userId && txn.user_id === userId) || txn.creator_email.toLowerCase() === email;
    const isReceiver = txn.reciever_email.toLowerCase() === email;
    const title = txn.title || `Transaction #${txn.id}`;
    const base = {
      transactionId: txn.id,
      title,
      amount: txn.amount,
      currency: txn.currency,
      status: txn.status,
      from: getCounterparty(txn, userEmail, userId),
      createdAt: txn.created_at.toISOString(),
      fundStatus: getFundStatus(txn.payment),
      deliveredAndReleasedStatus: getDeliveredAndReleasedStatus(txn.status),
      roleStatus: getUserRole(txn, userEmail, userId),
    };

    if (
      txn.cancel_requested_by_email &&
      txn.cancel_requested_by_email.toLowerCase() !== email &&
      (isCreator || isReceiver) &&
      FUNDED_ACTIVE_STATUSES.includes(txn.status as (typeof FUNDED_ACTIVE_STATUSES)[number])
    ) {
      actions.push({ ...base, type: "APPROVE_OR_REJECT_CANCEL" });
    }

    if (txn.status === "CREATED" && isReceiver) {
      actions.push({ ...base, type: "APPROVE_OR_REJECT" });
    }

    if (txn.status === "CHANGES_REQUESTED" && isCreator) {
      actions.push({ ...base, type: "REVISE_AND_RESUBMIT" });
    }

    if (
      txn.status === "APPROVED" &&
      isBuyer(txn, userEmail, userId) &&
      (!txn.payment || txn.payment.status !== "COMPLETED")
    ) {
      actions.push({ ...base, type: "PAY_ESCROW" });
    }

    if (txn.status === "PENDING_CLOSURE" && isBuyer(txn, userEmail, userId)) {
      actions.push({ ...base, type: "ACCEPT_OR_REJECT_CLOSURE" });
    }
  }

  actions.sort((a, b) => {
    const pa = ACTION_PRIORITY[a.type] ?? 99;
    const pb = ACTION_PRIORITY[b.type] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return actions;
}

export async function DashboardService(id: number, months?: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      email: true,
      walletBalanceNGN: true,
      walletBalanceUSD: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const { email } = user;

  const userFilter: Prisma.TransactionWhereInput = {
    OR: [
      { user_id: id },
      { creator_email: { equals: email, mode: "insensitive" } },
      { reciever_email: { equals: email, mode: "insensitive" } },
    ],
  };

  let dateFilter = {};
  if (months) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    dateFilter = { created_at: { gte: startDate } };
  }

  let createdAtFilter = {};
  if (months) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    createdAtFilter = { createdAt: { gte: startDate } };
  }

  const [
    totalTransactions,
    openDisputesCount,
    transactionCounts,
    userEarnings,
    activeTransactions,
    actionCandidates,
    openDisputes,
    notifications,
  ] = await Promise.all([
    prisma.transaction.count({
      where: {
        AND: [userFilter, dateFilter],
      },
    }),
    prisma.dispute.count({
      where: {
        status: "ongoing",
        OR: [{ buyerId: id }, { sellerId: id }, { creatorId: id }],
        ...createdAtFilter,
      },
    }),
    prisma.transaction.groupBy({
      by: ["status"],
      where: {
        AND: [userFilter, dateFilter],
      },
      _count: { id: true },
    }),
    prisma.earnings.findMany({
      where: {
        userId: id,
        ...createdAtFilter,
      },
      select: {
        createdAt: true,
        amount: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.findMany({
      where: {
        AND: [
          userFilter,
          { status: { in: [...ACTIVE_CONTRACT_STATUSES] } },
        ],
      },
      select: {
        id: true,
        title: true,
        amount: true,
        currency: true,
        status: true,
        deadline: true,
        created_at: true,
        user_id: true,
        payment_sent_to_escrow_at: true,
        transactionType: true,
        pay_escrow_fee: true,
        creator_email: true,
        creator_fullname: true,
        creator_role: true,
        reciever_email: true,
        receiver_fullname: true,
        reciever_role: true,
        payment: { select: { status: true } },
        milestones: {
          select: { id: true, name: true, amount: true, status: true, sequence: true },
          orderBy: { sequence: "asc" },
        },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.transaction.findMany({
      where: {
        AND: [
          userFilter,
          {
            OR: [
              {
                status: {
                  in: ["CREATED", "CHANGES_REQUESTED", "APPROVED", "PENDING_CLOSURE"],
                },
              },
              {
                cancel_requested_by_email: { not: null },
                status: { in: [...FUNDED_ACTIVE_STATUSES] },
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        title: true,
        amount: true,
        currency: true,
        status: true,
        created_at: true,
        user_id: true,
        creator_email: true,
        creator_fullname: true,
        creator_role: true,
        reciever_email: true,
        receiver_fullname: true,
        reciever_role: true,
        cancel_requested_by_email: true,
        payment: { select: { status: true } },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.dispute.findMany({
      where: {
        status: "ongoing",
        OR: [{ buyerId: id }, { sellerId: id }, { creatorId: id }],
      },
      select: {
        id: true,
        transactionId: true,
        transaction: {
          select: {
            id: true,
            title: true,
            amount: true,
            currency: true,
            status: true,
            created_at: true,
            user_id: true,
            creator_email: true,
            creator_fullname: true,
            creator_role: true,
            reciever_email: true,
            receiver_fullname: true,
            reciever_role: true,
            payment: { select: { status: true } },
          },
        },
      },
    }),
    prisma.notification.findMany({
      where: { receiver_user_id: id },
      select: {
        id: true,
        title: true,
        content: true,
        timestamp: true,
      },
      orderBy: { timestamp: "desc" },
      take: 15,
    }),
  ]);

  let ongoingCount = 0;
  let cancelledCount = 0;
  let completedCount = 0;

  transactionCounts.forEach((t) => {
    if (t.status === "ONGOING") ongoingCount = t._count.id;
    if (t.status === "CANCELED") cancelledCount = t._count.id;
    if (t.status === "COMPLETED") completedCount = t._count.id;
  });

  const amountPerPeriod: Record<string, number> = {};
  const monthsToIterate = months || 12;
  const currentDate = new Date();

  for (let i = monthsToIterate - 1; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const period = d.toISOString().slice(0, 7);
    amountPerPeriod[period] = 0;
  }

  userEarnings.forEach((e) => {
    const period = e.createdAt.toISOString().slice(0, 7);
    if (amountPerPeriod[period] !== undefined) {
      amountPerPeriod[period] += e.amount.toNumber();
    } else if (!months) {
      amountPerPeriod[period] = e.amount.toNumber();
    }
  });

  const lockedEscrow: CurrencyBucket = { NGN: 0, USD: 0 };
  for (const txn of activeTransactions) {
    if (
      txn.payment?.status === "COMPLETED" &&
      FUNDED_ACTIVE_STATUSES.includes(txn.status as (typeof FUNDED_ACTIVE_STATUSES)[number])
    ) {
      addToBucket(lockedEscrow, txn.currency, computeLockedAmount(txn));
    }
  }

  const balance = {
    availableWithdrawable: {
      NGN: toNumber(user.walletBalanceNGN),
      USD: toNumber(user.walletBalanceUSD),
    },
    lockedEscrow,
  };

  const allActions = buildActionsForUser(email, actionCandidates, openDisputes, id);
  const actionsRequired = {
    count: allActions.length,
    items: allActions.slice(0, 20),
  };

  const activeContracts = activeTransactions.slice(0, 20).map((txn) => {
    const activeMilestone =
      txn.milestones.find((m) =>
        ["ONGOING", "PENDING_CLOSURE", "DISPUTE"].includes(m.status)
      ) ?? null;

    return {
      id: txn.id,
      title: txn.title || `Transaction #${txn.id}`,
      amount: txn.amount,
      currency: txn.currency,
      status: txn.status,
      deadline: txn.deadline.toISOString(),
      counterparty: getCounterparty(txn, email, id),
      paymentSentToEscrowAt: txn.payment_sent_to_escrow_at?.toISOString() ?? null,
      fundedStatus: getFundStatus(txn.payment),
      feePayer: txn.pay_escrow_fee,
      role: getUserRole(txn, email, id),
      activeMilestone: activeMilestone
        ? {
            id: activeMilestone.id,
            name: activeMilestone.name,
            amount: activeMilestone.amount,
            status: activeMilestone.status,
          }
        : null,
    };
  });

  const recentActivity = notifications.map((n) => ({
    id: n.id,
    title: n.title,
    description: n.content,
    time: n.timestamp.toISOString(),
  }));

  return {
    escrowBalance: balance.lockedEscrow.NGN,
    totalTransactions,
    openDisputes: openDisputesCount,
    transactionCount: {
      ongoing: ongoingCount,
      cancelled: cancelledCount,
      completed: completedCount,
    },
    amountPerPeriod,
    balance,
    actionsRequired,
    activeContracts,
    recentActivity,
  };
}
