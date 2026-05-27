-- AlterTable
ALTER TABLE "Transaction" 
ADD COLUMN "agreement_accepted_at" TIMESTAMP(3),
ADD COLUMN "payment_sent_to_escrow_at" TIMESTAMP(3),
ADD COLUMN "inspection_started_at" TIMESTAMP(3),
ADD COLUMN "inspection_completed_at" TIMESTAMP(3),
ADD COLUMN "transaction_completed_at" TIMESTAMP(3);
