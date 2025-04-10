/*
  Warnings:

  - You are about to drop the column `evidence` on the `Dispute` table. All the data in the column will be lost.
  - Added the required column `evidenceId` to the `Dispute` table without a default value. This is not possible if the table is not empty.
  - Added the required column `evidenceUrl` to the `Dispute` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Dispute" DROP COLUMN "evidence",
ADD COLUMN     "evidenceId" TEXT NOT NULL,
ADD COLUMN     "evidenceUrl" TEXT NOT NULL;
