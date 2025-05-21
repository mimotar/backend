-- AlterEnum
ALTER TYPE "StatusEnum" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "status" SET DEFAULT 'CREATED';
