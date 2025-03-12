-- CreateEnum
CREATE TYPE "Read" AS ENUM ('read', 'unread');

-- CreateEnum
CREATE TYPE "DefaultCurrency" AS ENUM ('GBP', 'USD', 'NGN');

-- CreateEnum
CREATE TYPE "NotificationPreference" AS ENUM ('SMS', 'EMAIL', 'BOTH');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('ongoing', 'dispute', 'cancel', 'completed');

-- CreateEnum
CREATE TYPE "Label" AS ENUM ('ongoing', 'dispute', 'cancel', 'completed');

-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "disable_status" BOOLEAN NOT NULL,
    "delete_status" BOOLEAN NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chat" (
    "id" SERIAL NOT NULL,
    "content" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sender_user_id" INTEGER NOT NULL,
    "receiver_user_id" INTEGER NOT NULL,

    CONSTRAINT "Chat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "message" VARCHAR(300) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dispute" (
    "id" SERIAL NOT NULL,
    "transactionId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "statusId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "elapsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "chatId" INTEGER NOT NULL,
    "sender_userId" INTEGER NOT NULL,
    "receiver_userId" INTEGER NOT NULL,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "sender_user_id" INTEGER NOT NULL,
    "receiver_user_id" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" TEXT,
    "link" TEXT,
    "avatar" TEXT NOT NULL,
    "read" "Read" NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "phone_no" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "bio" VARCHAR(100) NOT NULL,
    "verification_no" TEXT NOT NULL,
    "verification_type" TEXT NOT NULL,
    "next_kin" TEXT NOT NULL,
    "next_email" TEXT NOT NULL,
    "next_no" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityQuestion" (
    "id" SERIAL NOT NULL,
    "securityQuestionOne" TEXT NOT NULL,
    "securityQuestionTwo" TEXT NOT NULL,
    "securityQuestionThree" TEXT NOT NULL,

    CONSTRAINT "SecurityQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" SERIAL NOT NULL,
    "defaultCurrency" "DefaultCurrency" NOT NULL,
    "notificationPreference" "NotificationPreference" NOT NULL,
    "securityQuestionId" INTEGER NOT NULL,
    "twoFactorAuth" BOOLEAN NOT NULL,
    "accountId" INTEGER NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "amount" INTEGER NOT NULL,
    "description" VARCHAR(200) NOT NULL,
    "user_id" INTEGER NOT NULL,
    "status_id" "Status" NOT NULL DEFAULT 'ongoing',
    "pay_escrow_fee" INTEGER NOT NULL,
    "additional_agreement" VARCHAR(200) NOT NULL,
    "pay_shipping_cost" INTEGER NOT NULL,
    "creator_fullname" TEXT NOT NULL,
    "creator_email" TEXT NOT NULL,
    "creator_no" TEXT NOT NULL,
    "creator_address" TEXT NOT NULL,
    "creator_role" TEXT NOT NULL,
    "receiver_fullname" TEXT NOT NULL,
    "receiver_no" TEXT NOT NULL,
    "receiver_address" TEXT NOT NULL,
    "link_expires" BOOLEAN NOT NULL DEFAULT false,
    "txn_link" TEXT NOT NULL,
    "agreement" TEXT NOT NULL,
    "txn_type" TEXT NOT NULL,
    "duration" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transactionstatus" (
    "id" INTEGER NOT NULL,
    "label" "Label" NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "name" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_transactionId_key" ON "Dispute"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_statusId_key" ON "Dispute"("statusId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_chatId_key" ON "Dispute"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_sender_userId_key" ON "Dispute"("sender_userId");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_receiver_userId_key" ON "Dispute"("receiver_userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_user_id_key" ON "Profile"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_creator_email_key" ON "Transaction"("creator_email");

-- CreateIndex
CREATE UNIQUE INDEX "Transactionstatus_id_key" ON "Transactionstatus"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_receiver_user_id_fkey" FOREIGN KEY ("receiver_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Transactionstatus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_sender_userId_fkey" FOREIGN KEY ("sender_userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_receiver_userId_fkey" FOREIGN KEY ("receiver_userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_securityQuestionId_fkey" FOREIGN KEY ("securityQuestionId") REFERENCES "SecurityQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
