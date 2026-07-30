import type { Prisma } from "../../generated/prisma/client.js";
import { GlobalError } from "../../middlewares/error/GlobalErrorHandler.js";

type TransactionClient = Prisma.TransactionClient;

/**
 * Sole path that moves an APPROVED transaction to ONGOING after verified payment.
 * Also activates the first milestone for milestone-based projects.
 * Must be called inside a Prisma interactive transaction after payment is recorded.
 */
export async function activateTransactionAfterPayment(
  transactionId: number,
  client: TransactionClient
) {
  const transaction = await client.transaction.findUnique({
    where: { id: transactionId },
    include: { milestones: { orderBy: { sequence: "asc" } } },
  });

  if (!transaction) {
    throw new GlobalError("Transaction not found", "NotFoundError", 404, true);
  }

  if (transaction.status === "ONGOING") {
    return transaction;
  }

  if (transaction.status !== "APPROVED") {
    throw new GlobalError(
      `Cannot activate payment for a transaction in status ${transaction.status}`,
      "INVALID_TRANSACTION_STATE",
      409,
      true
    );
  }

  const now = new Date();
  const updatedTransaction = await client.transaction.update({
    where: { id: transactionId },
    data: {
      status: "ONGOING",
      payment_sent_to_escrow_at: now,
      inspection_started_at: now,
    },
  });

  if (
    transaction.transactionType === "MILESTONE_BASED_PROJECT" &&
    transaction.milestones.length > 0
  ) {
    const [firstMilestone] = transaction.milestones;
    if (firstMilestone.status === "CREATED") {
      await client.milestone.update({
        where: { id: firstMilestone.id },
        data: { status: "ONGOING", activatedAt: now },
      });
    }
  }

  return updatedTransaction;
}
