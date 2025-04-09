/*
  Warnings:

  - You are about to drop the column `agreement` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `duration` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `txn_type` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `inspection_duration` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reciever_role` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transactionType` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `transaction_description` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `pay_escrow_fee` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `pay_shipping_cost` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `creator_role` on the `Transaction` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "EscrowFeePayer" AS ENUM ('BUYER', 'SELLER', 'BOTH');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('BUYER', 'SELLER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('PHYSICAL_PRODUCT', 'ONLINE_PRODUCT', 'SERVICE');

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "agreement",
DROP COLUMN "description",
DROP COLUMN "duration",
DROP COLUMN "txn_type",
ADD COLUMN     "inspection_duration" INTEGER NOT NULL,
ADD COLUMN     "reciever_role" "Role" NOT NULL,
ADD COLUMN     "terms" TEXT,
ADD COLUMN     "transactionType" "TransactionType" NOT NULL,
ADD COLUMN     "transaction_description" VARCHAR(200) NOT NULL,
DROP COLUMN "pay_escrow_fee",
ADD COLUMN     "pay_escrow_fee" "EscrowFeePayer" NOT NULL,
DROP COLUMN "pay_shipping_cost",
ADD COLUMN     "pay_shipping_cost" "EscrowFeePayer" NOT NULL,
ALTER COLUMN "creator_address" DROP NOT NULL,
DROP COLUMN "creator_role",
ADD COLUMN     "creator_role" "Role" NOT NULL,
ALTER COLUMN "receiver_address" DROP NOT NULL;
