/*
  Warnings:

  - A unique constraint covering the columns `[transaction_reference]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `title` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "title" VARCHAR(200) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transaction_reference_key" ON "Payment"("transaction_reference");
