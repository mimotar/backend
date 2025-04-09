-- CreateEnum
CREATE TYPE "Reasons" AS ENUM ('PRODUCT_NOT_AS_DESCRIBED', 'DAMAGED_OR_DEFECTIVE_ITEM', 'ITEM_NOT_RECEIVED', 'WRONG_ITEM_SENT', 'LATE_DELIVERY', 'COUNTERFEIT_OR_FAKE_ITEM', 'INCOMPLETE_SERVICE_RENDERED', 'POOR_QUALITY');

-- CreateEnum
CREATE TYPE "ResolutionOption" AS ENUM ('REFUND_ONLY', 'REPLACEMENT_ONLY', 'REFUND_OR_REPLACEMENT', 'PARTIAL_REPAYMENT', 'RESEND_PRODUCT', 'REPEAT_SERVICE', 'CANCEL_TRANSACTION');

-- CreateEnum
CREATE TYPE "Read" AS ENUM ('read', 'unread');

-- CreateEnum
CREATE TYPE "DefaultCurrency" AS ENUM ('GBP', 'USD', 'NGN');

-- CreateEnum
CREATE TYPE "NotificationPreference" AS ENUM ('SMS', 'EMAIL', 'BOTH');

-- CreateEnum
CREATE TYPE "EscrowFeePayer" AS ENUM ('BUYER', 'SELLER', 'BOTH');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BUYER', 'SELLER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PHYSICAL_PRODUCT', 'ONLINE_PRODUCT', 'SERVICE');

-- CreateEnum
CREATE TYPE "StatusEnum" AS ENUM ('ONGOING', 'DISPUTE', 'CANCEL', 'COMPLETED');

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
    "transactionId" INTEGER,
    "amount" INTEGER,
    "statusId" INTEGER,
    "timestamp" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "elapsed" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "chatId" INTEGER,
    "sender_userId" INTEGER,
    "receiver_userId" INTEGER,
    "description" TEXT NOT NULL,
    "reason" "Reasons" NOT NULL,
    "resolutionOption" "ResolutionOption" NOT NULL,
    "evidence" TEXT NOT NULL,

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
    "address" TEXT,
    "phone_no" TEXT,
    "avatar" TEXT,
    "bio" VARCHAR(100),
    "verification_no" TEXT,
    "verification_type" TEXT,
    "next_kin" TEXT,
    "next_email" TEXT,
    "next_no" TEXT,
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
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "sid" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
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
    "user_id" INTEGER,
    "additional_agreement" VARCHAR(200) NOT NULL,
    "creator_fullname" TEXT NOT NULL,
    "creator_email" TEXT NOT NULL,
    "creator_no" TEXT NOT NULL,
    "creator_address" TEXT,
    "receiver_fullname" TEXT NOT NULL,
    "receiver_no" TEXT NOT NULL,
    "receiver_address" TEXT,
    "link_expires" BOOLEAN NOT NULL DEFAULT false,
    "txn_link" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "inspection_duration" INTEGER NOT NULL,
    "reciever_role" "Role" NOT NULL,
    "terms" TEXT,
    "transactionType" "TransactionType" NOT NULL,
    "transaction_description" VARCHAR(200) NOT NULL,
    "pay_escrow_fee" "EscrowFeePayer" NOT NULL,
    "pay_shipping_cost" "EscrowFeePayer" NOT NULL,
    "creator_role" "Role" NOT NULL,
    "status" "StatusEnum" NOT NULL DEFAULT 'ONGOING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "transactionToken" TEXT NOT NULL,
    "reciever_email" TEXT NOT NULL,

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
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationToken" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "provider" TEXT,
    "subject" TEXT,

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
CREATE UNIQUE INDEX "session_sid_key" ON "session"("sid");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_creator_email_key" ON "Transaction"("creator_email");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_transactionToken_key" ON "Transaction"("transactionToken");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reciever_email_key" ON "Transaction"("reciever_email");

-- CreateIndex
CREATE UNIQUE INDEX "Transactionstatus_id_key" ON "Transactionstatus"("id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_receiver_user_id_fkey" FOREIGN KEY ("receiver_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chat" ADD CONSTRAINT "Chat_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_sender_user_id_fkey" FOREIGN KEY ("sender_user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_securityQuestionId_fkey" FOREIGN KEY ("securityQuestionId") REFERENCES "SecurityQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
