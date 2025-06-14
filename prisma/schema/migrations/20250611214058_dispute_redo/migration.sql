/*
  Warnings:

  - You are about to drop the column `receiver_user_id` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `sender_user_id` on the `Chat` table. All the data in the column will be lost.
  - You are about to drop the column `amount` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `elapsed` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `receiver_userId` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `sender_userId` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `statusId` on the `Dispute` table. All the data in the column will be lost.
  - You are about to drop the column `timestamp` on the `Dispute` table. All the data in the column will be lost.
  - The `evidenceUrl` column on the `Dispute` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `evidenceId` column on the `Dispute` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Transactionstatus` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[transactionId,chatId]` on the table `Dispute` will be added. If there are existing duplicate values, this will fail.
  - Made the column `transactionId` on table `Dispute` required. This step will fail if there are existing NULL values in that column.
  - Changed the type of `reason` on the `Dispute` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "disputeStatus" AS ENUM ('ongoing', 'cancel', 'closed');

-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_receiver_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Chat" DROP CONSTRAINT "Chat_sender_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_receiver_userId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_sender_userId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_statusId_fkey";

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_transactionId_fkey";

-- DropIndex
DROP INDEX "Dispute_receiver_userId_key";

-- DropIndex
DROP INDEX "Dispute_sender_userId_key";

-- DropIndex
DROP INDEX "Dispute_statusId_key";

-- AlterTable
ALTER TABLE "Chat" DROP COLUMN "receiver_user_id",
DROP COLUMN "sender_user_id";

-- AlterTable
ALTER TABLE "Dispute" DROP COLUMN "amount",
DROP COLUMN "elapsed",
DROP COLUMN "receiver_userId",
DROP COLUMN "sender_userId",
DROP COLUMN "statusId",
DROP COLUMN "timestamp",
ADD COLUMN     "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "elapsesAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "status" "disputeStatus" NOT NULL DEFAULT 'ongoing',
ALTER COLUMN "transactionId" SET NOT NULL,
DROP COLUMN "reason",
ADD COLUMN     "reason" TEXT NOT NULL,
DROP COLUMN "evidenceUrl",
ADD COLUMN     "evidenceUrl" TEXT[],
DROP COLUMN "evidenceId",
ADD COLUMN     "evidenceId" TEXT[];

-- DropTable
DROP TABLE "Transactionstatus";

-- DropEnum
DROP TYPE "Label";

-- DropEnum
DROP TYPE "Reasons";

-- CreateTable
CREATE TABLE "ChatrParticipants" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "chatId" INTEGER NOT NULL,
    "role" "ChatRole" NOT NULL DEFAULT 'USER',

    CONSTRAINT "ChatrParticipants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "chatId" INTEGER NOT NULL,
    "senderId" INTEGER NOT NULL,
    "content" TEXT,
    "fileUrl" TEXT,
    "fileType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ChatrParticipants_chatId_idx" ON "ChatrParticipants"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "ChatrParticipants_userId_chatId_key" ON "ChatrParticipants"("userId", "chatId");

-- CreateIndex
CREATE INDEX "Message_chatId_idx" ON "Message"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_transactionId_chatId_key" ON "Dispute"("transactionId", "chatId");

-- AddForeignKey
ALTER TABLE "ChatrParticipants" ADD CONSTRAINT "ChatrParticipants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatrParticipants" ADD CONSTRAINT "ChatrParticipants_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
