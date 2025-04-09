/*
  Warnings:

  - A unique constraint covering the columns `[transactionToken]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[reciever_email]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `description` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reason` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `resolutionOption` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiresAt` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reciever_email` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transactionToken` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Reasons" AS ENUM ('PRODUCT_NOT_AS_DESCRIBED', 'DAMAGED_OR_DEFECTIVE_ITEM', 'ITEM_NOT_RECEIVED', 'WRONG_ITEM_SENT', 'LATE_DELIVERY', 'COUNTERFEIT_OR_FAKE_ITEM', 'INCOMPLETE_SERVICE_RENDERED', 'POOR_QUALITY');

-- CreateEnum
CREATE TYPE "ResolutionOption" AS ENUM ('REFUND_ONLY', 'REPLACEMENT_ONLY', 'REFUND_OR_REPLACEMENT', 'PARTIAL_REPAYMENT', 'RESEND_PRODUCT', 'REPEAT_SERVICE', 'CANCEL_TRANSACTION');

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_chatId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_receiver_userId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_sender_userId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_statusId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_transactionId_fkey";

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "reason" "Reasons" NOT NULL,
ADD COLUMN     "resolutionOption" "ResolutionOption" NOT NULL,
ALTER COLUMN "transactionId" DROP NOT NULL,
ALTER COLUMN "amount" DROP NOT NULL,
ALTER COLUMN "statusId" DROP NOT NULL,
ALTER COLUMN "timestamp" DROP NOT NULL,
ALTER COLUMN "elapsed" DROP NOT NULL,
ALTER COLUMN "chatId" DROP NOT NULL,
ALTER COLUMN "sender_userId" DROP NOT NULL,
ALTER COLUMN "receiver_userId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "expiresAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "reciever_email" TEXT NOT NULL,
ADD COLUMN     "transactionToken" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_transactionToken_key" ON "Transaction"("transactionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reciever_email_key" ON "Transaction"("reciever_email");

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Transactionstatus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_sender_userId_fkey" FOREIGN KEY ("sender_userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_receiver_userId_fkey" FOREIGN KEY ("receiver_userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
