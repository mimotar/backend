import { Queue, Worker, Job } from "bullmq";
import { redisConnection } from "./redis.js";
import { prisma } from "./db.js";
import { EmailType } from "../emails/templates/emailTypes.brevo.js";
import { sendEmail } from "../services/emailService.js";

export const TRANSACTION_CLOSURE_QUEUE = "transaction-closure-queue";

export const transactionClosureQueue = new Queue(TRANSACTION_CLOSURE_QUEUE, {
  connection: redisConnection,
});

// Worker handles the auto-completion of a transaction if it hasn't been closed after 24hrs
const worker = new Worker(
  TRANSACTION_CLOSURE_QUEUE,
  async (job: Job) => {
    const { transactionId } = job.data;
    
    // Find transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      console.error(`Job failed: Transaction ${transactionId} not found`);
      return;
    }

    // Only process if it is still PENDING_CLOSURE
    if (transaction.status === "PENDING_CLOSURE") {
      const updatedTransaction = await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: "COMPLETED" },
      });

      // Send autocomplete emails to both parties
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

      console.log(`Transaction ${transactionId} auto-completed by worker`);
    } else {
      console.log(`Transaction ${transactionId} skipped - status is ${transaction.status}`);
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
