-- AlterEnum
ALTER TYPE "StatusEnum" ADD VALUE 'REJECTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TransactionType" ADD VALUE 'RENTAL';
ALTER TYPE "TransactionType" ADD VALUE 'MILESTONE_BASED_PROJECT';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "files" JSON;
