-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "delivery_rejection_reason" VARCHAR(2000);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "delivery_rejected_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "delivery_rejection_reason" VARCHAR(2000);
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "delivery_rejected_at" TIMESTAMP(3);
