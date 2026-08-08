-- AlterEnum
ALTER TYPE "OtpPurpose" ADD VALUE IF NOT EXISTS 'WITHDRAWAL';

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "WithdrawalStatus" AS ENUM (
    'OTP_PENDING',
    'PROCESSING',
    'PENDING_MANUAL',
    'COMPLETED',
    'FAILED',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Withdrawal" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" DECIMAL(19,2) NOT NULL,
    "currency" "CurrencyEnum" NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'OTP_PENDING',
    "reference" TEXT NOT NULL,
    "bankAccountId" INTEGER,
    "accountBank" TEXT,
    "accountNumber" TEXT,
    "accountName" TEXT,
    "providerTransferId" TEXT,
    "failureReason" TEXT,
    "otp" TEXT,
    "otpCreatedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Withdrawal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Withdrawal_reference_key" ON "Withdrawal"("reference");
CREATE INDEX IF NOT EXISTS "Withdrawal_userId_status_createdAt_idx" ON "Withdrawal"("userId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Withdrawal_reference_idx" ON "Withdrawal"("reference");

DO $$ BEGIN
  ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "Withdrawal" ADD CONSTRAINT "Withdrawal_bankAccountId_fkey"
    FOREIGN KEY ("bankAccountId") REFERENCES "BankAccountDetail"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
