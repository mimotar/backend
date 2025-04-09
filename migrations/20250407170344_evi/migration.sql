/*
  Warnings:

  - Added the required column `evidence` to the `Dispute` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "evidence" TEXT NOT NULL;
