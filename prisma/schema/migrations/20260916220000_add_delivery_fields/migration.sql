-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "delivery_note" VARCHAR(2000);
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "delivery_file" JSONB;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "delivery_submitted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "delivery_note" VARCHAR(2000);
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "delivery_file" JSONB;
ALTER TABLE "Milestone" ADD COLUMN IF NOT EXISTS "delivery_submitted_at" TIMESTAMP(3);
