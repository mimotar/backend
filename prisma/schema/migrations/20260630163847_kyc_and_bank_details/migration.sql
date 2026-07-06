/*
  Warnings:

  - You are about to alter the column `amount` on the `Transaction` table. The data in that column could be lost. The data in that column will be cast from `Decimal(19,2)` to `Integer`.
  - Added the required column `title` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EarningsStatus" AS ENUM ('PENDING', 'COMPLETED', 'WITHDRAWN', 'REVERSED');

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_sender_user_id_fkey";

-- AlterTable
ALTER TABLE "Earnings" ADD COLUMN     "status" "EarningsStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "Milestone" ALTER COLUMN "files" SET DATA TYPE JSON;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "title" TEXT NOT NULL,
ALTER COLUMN "sender_user_id" DROP NOT NULL,
ALTER COLUMN "read" SET DEFAULT 'unread';

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "amount" SET DATA TYPE INTEGER;

-- CreateTable
CREATE TABLE "UserKYC" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "kycDocumentType" TEXT,
    "kycDocumentNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserKYC_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankAccountDetail" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankAccountDetail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserKYC_userId_key" ON "UserKYC"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccountDetail_userId_key" ON "BankAccountDetail"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccountDetail_accountNumber_key" ON "BankAccountDetail"("accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX "BankAccountDetail_bankCode_accountNumber_userId_key" ON "BankAccountDetail"("bankCode", "accountNumber", "userId");

-- AddForeignKey
ALTER TABLE "UserKYC" ADD CONSTRAINT "UserKYC_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankAccountDetail" ADD CONSTRAINT "BankAccountDetail_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
