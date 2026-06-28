import { Queue, Worker, Job } from "bullmq";
import { redisConnection } from "./redis.js";
import { prisma } from "./db.js";
import { EmailType } from "../emails/templates/emailTypes.brevo.js";
import { sendEmail } from "../services/emailService.js";
import { settleEscrowScope } from "../services/escrow-settlement.service.js";

export const TRANSACTION_CLOSURE_QUEUE = "transaction-closure-queue";
export const TRANSACTION_CLOSURE_DELAY_HOURS = 48;
export const TRANSACTION_CLOSURE_DELAY_MS =
  TRANSACTION_CLOSURE_DELAY_HOURS * 60 * 60 * 1000;

export const transactionClosureQueue = new Queue(TRANSACTION_CLOSURE_QUEUE, {
  connection: redisConnection,
});

async function normalizeExistingClosureDelays() {
  const delayedJobs = await transactionClosureQueue.getJobs(["delayed"]);
  const now = Date.now();

  await Promise.all(
    delayedJobs.map(async (job) => {
      const currentRunAt = job.timestamp + job.delay;
      const requiredRunAt = job.timestamp + TRANSACTION_CLOSURE_DELAY_MS;

      if (currentRunAt >= requiredRunAt || requiredRunAt <= now) {
        return;
      }

      await job.changeDelay(requiredRunAt - now);
    })
  );
}

// Jobs created before this change retain their original BullMQ delay. Bring
// those pending jobs up to the same 48-hour period without delaying them twice.
void normalizeExistingClosureDelays().catch((error) => {
  console.error("Failed to normalize existing closure delays:", error);
});

// Worker handles auto-completion after the 48-hour review period.
const worker = new Worker(
  TRANSACTION_CLOSURE_QUEUE,
  async (job: Job) => {
    const { transactionId, milestoneId } = job.data as {
      transactionId: number;
      milestoneId?: number;
    };
    
    // Find transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      console.error(`Job failed: Transaction ${transactionId} not found`);
      return;
    }

    const milestone = milestoneId
      ? await prisma.milestone.findUnique({ where: { id: milestoneId } })
      : null;

    // Only process the scope that is still waiting for closure.
    const isPending = milestoneId
      ? milestone?.transaction_id === transactionId &&
        milestone.status === "PENDING_CLOSURE"
      : transaction.status === "PENDING_CLOSURE";

    if (isPending) {
      const settlement = await settleEscrowScope(transactionId, { milestoneId });
      const updatedTransaction = settlement.transaction;

      if (updatedTransaction.status === "COMPLETED") {
        // Final milestone and ordinary transaction completion use the existing
        // transaction-completed templates.
        await sendEmail(updatedTransaction.creator_email, EmailType.TRANSACTION_COMPLETED, {
          name: updatedTransaction.creator_fullname,
          transactionId: updatedTransaction.transactionToken,
          autoCompleted: true,
        });

        await sendEmail(updatedTransaction.reciever_email, EmailType.TRANSACTION_COMPLETED, {
          name: updatedTransaction.receiver_fullname,
          transactionId: updatedTransaction.transactionToken,
          autoCompleted: true,
        });
      }

      console.log(
        milestoneId
          ? `Milestone ${milestoneId} auto-completed by worker`
          : `Transaction ${transactionId} auto-completed by worker`
      );
    } else {
      console.log(`Closure job for transaction ${transactionId} skipped because its scope is no longer pending`);
    }
  },
  { connection: redisConnection }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.log(`Job ${job?.id} has failed with ${err.message}`);
});
