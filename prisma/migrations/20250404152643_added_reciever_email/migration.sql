/*
  Warnings:

  - A unique constraint covering the columns `[reciever_email]` on the table `Transaction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `reciever_email` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "reciever_email" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_reciever_email_key" ON "Transaction"("reciever_email");
