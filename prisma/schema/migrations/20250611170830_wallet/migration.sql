/*
  Warnings:

  - A unique constraint covering the columns `[transaction_id]` on the table `Earnings` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `transaction_id` to the `Earnings` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('INFLOW', 'OUTFLOW');

-- AlterEnum
ALTER TYPE "Reasons" ADD VALUE 'OTHERS';

-- AlterEnum
ALTER TYPE "ResolutionOption" ADD VALUE 'OTHERS';

-- AlterTable
ALTER TABLE "Earnings" ADD COLUMN     "description" TEXT,
ADD COLUMN     "transaction_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "walletBalance" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Earnings_transaction_id_key" ON "Earnings"("transaction_id");

-- AddForeignKey
ALTER TABLE "Earnings" ADD CONSTRAINT "Earnings_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
