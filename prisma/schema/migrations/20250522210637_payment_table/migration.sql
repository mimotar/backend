-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'ATM_CARD', 'INTERNET_BANKING', 'APPLE_PAY', 'GOOGLE_PAY', 'USSD');

-- CreateEnum
CREATE TYPE "CurrencyEnum" AS ENUM ('USD', 'GBP', 'NGN', 'GHS', 'KES', 'RWF');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "payment_id" INTEGER;

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "transaction_reference" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL DEFAULT 'ATM_CARD',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "currency" "CurrencyEnum" NOT NULL DEFAULT 'USD',

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transaction_id_key" ON "Payment"("transaction_id");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
