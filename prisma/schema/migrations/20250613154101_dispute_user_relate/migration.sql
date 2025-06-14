/*
  Warnings:

  - Added the required column `buyerId` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `creatorId` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellerId` to the `Dispute` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "buyerId" INTEGER NOT NULL,
ADD COLUMN     "creatorId" INTEGER NOT NULL,
ADD COLUMN     "sellerId" INTEGER NOT NULL,
ALTER COLUMN "elapsesAt" DROP DEFAULT;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
