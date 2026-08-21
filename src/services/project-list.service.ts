import { Prisma } from "../generated/prisma/client.js";
import prisma from "../utils/prisma.js";
import { ProjectsQueryType } from "../zod/TicketSchema.js";

const ACTIVE_MILESTONE_STATUSES = ["ONGOING", "PENDING_CLOSURE", "DISPUTE"] as const;

const projectSelect = {
  id: true,
  title: true,
  receiver_fullname: true,
  reciever_email: true,
  creator_email: true,
  created_at: true,
  transactionToken: true,
  txn_link: true,
  amount: true,
  transaction_description: true,
  files: true,
  status: true,
  creator_address: true,
  creator_fullname: true,
  currency: true,
  dispute: true,
  payment: true,
  earnings: true,
  inspection_duration: true,
  reciever_role: true,
  terms: true,
  transactionType: true,
  pay_escrow_fee: true,
  pay_shipping_cost: true,
  creator_role: true,
  receiver_address: true,
  receiver_no: true,
  expiresAt: true,
  link_expires: true,
  agreement_accepted_at: true,
  payment_sent_to_escrow_at: true,
  inspection_started_at: true,
  inspection_completed_at: true,
  transaction_completed_at: true,
  deadline: true,
  change_request_comment: true,
  change_requested_at: true,
  change_requested_by_email: true,
  revision_count: true,
  deadlineExtensions: {
    where: { milestoneId: null },
    orderBy: { createdAt: "desc" as const },
  },
  milestones: {
    include: {
      images: {
        select: { id: true, url: true, createdAt: true },
        orderBy: { createdAt: "asc" as const },
      },
      deadlineExtensions: { orderBy: { createdAt: "desc" as const } },
    },
    orderBy: { sequence: "asc" as const },
  },
} satisfies Prisma.TransactionSelect;

function buildMilestoneSummary(
  transactionType: string,
  milestones: Array<{
    id: number;
    sequence: number;
    name: string;
    status: string;
    amount: number;
  }>
) {
  if (transactionType !== "MILESTONE_BASED_PROJECT") {
    return null;
  }

  const active =
    milestones.find((m) =>
      ACTIVE_MILESTONE_STATUSES.includes(
        m.status as (typeof ACTIVE_MILESTONE_STATUSES)[number]
      )
    ) ?? null;

  return {
    total: milestones.length,
    active: active
      ? {
          id: active.id,
          sequence: active.sequence,
          name: active.name,
          status: active.status,
          amount: active.amount,
        }
      : null,
    activeIndex: active?.sequence ?? null,
    completedCount: milestones.filter((m) => m.status === "COMPLETED").length,
  };
}

export async function listUserProjectsService(
  userEmail: string,
  query: ProjectsQueryType
) {
  const { page, limit, q, status, amount, minAmount, maxAmount } = query;
  const skip = (page - 1) * limit;

  const amountFilter: Prisma.IntFilter = {};
  if (amount !== undefined) amountFilter.equals = amount;
  if (minAmount !== undefined) amountFilter.gte = minAmount;
  if (maxAmount !== undefined) amountFilter.lte = maxAmount;

  const where: Prisma.TransactionWhereInput = {
    AND: [
      {
        OR: [{ creator_email: userEmail }, { reciever_email: userEmail }],
      },
      ...(status?.length ? [{ status: { in: status } }] : []),
      ...(q
        ? [
            {
              OR: [
                { title: { contains: q, mode: "insensitive" as const } },
                {
                  transaction_description: {
                    contains: q,
                    mode: "insensitive" as const,
                  },
                },
              ],
            },
          ]
        : []),
      ...(Object.keys(amountFilter).length > 0 ? [{ amount: amountFilter }] : []),
    ],
  };

  const [rows, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      select: projectSelect,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  const email = userEmail.toLowerCase();
  const items = rows.map((transaction) => {
    const isCreator = transaction.creator_email.toLowerCase() === email;
    const myRole = isCreator
      ? transaction.creator_role
      : transaction.reciever_role;
    const counterparty = isCreator
      ? {
          name: transaction.receiver_fullname,
          email: transaction.reciever_email,
          role: transaction.reciever_role,
        }
      : {
          name: transaction.creator_fullname,
          email: transaction.creator_email,
          role: transaction.creator_role,
        };

    const {
      agreement_accepted_at,
      payment_sent_to_escrow_at,
      inspection_started_at,
      inspection_completed_at,
      transaction_completed_at,
      ...rest
    } = transaction;

    return {
      ...rest,
      myRole,
      counterparty,
      dueAt: transaction.deadline.toISOString(),
      milestoneSummary: buildMilestoneSummary(
        transaction.transactionType,
        transaction.milestones
      ),
      history: {
        transaction_created_at: transaction.created_at.toISOString(),
        agreement_accepted_at: agreement_accepted_at?.toISOString() ?? null,
        payment_sent_to_escrow_at: payment_sent_to_escrow_at?.toISOString() ?? null,
        inspection_started_at: inspection_started_at?.toISOString() ?? null,
        inspection_completed_at: inspection_completed_at?.toISOString() ?? null,
        transaction_completed_at: transaction_completed_at?.toISOString() ?? null,
      },
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}
