-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "cancel_requested_by_email" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "cancel_requested_at" TIMESTAMP(3);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "cancel_reason" VARCHAR(500);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "cancel_approved_at" TIMESTAMP(3);
