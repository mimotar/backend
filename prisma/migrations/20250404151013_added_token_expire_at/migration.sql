/*
  Warnings:

  - A unique constraint covering the columns `[transactionToken]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `expiresAt` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transactionToken` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "transactionToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_transactionToken_key" ON "Transaction"("transactionToken");
