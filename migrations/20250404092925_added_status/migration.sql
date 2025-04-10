/*
  Warnings:

  - You are about to drop the column `status_id` on the `Transaction` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StatusEnum" AS ENUM ('ONGOING', 'DISPUTE', 'CANCEL', 'COMPLETED');

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "status_id",
ADD COLUMN     "status" "StatusEnum" NOT NULL DEFAULT 'ONGOING';

-- DropEnum
DROP TYPE "Status";
