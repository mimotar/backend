-- AlterEnum
ALTER TYPE "StatusEnum" ADD VALUE IF NOT EXISTS 'CHANGES_REQUESTED';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "change_request_comment" VARCHAR(500);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "change_requested_at" TIMESTAMP(3);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "change_requested_by_email" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "revision_count" INTEGER NOT NULL DEFAULT 0;
