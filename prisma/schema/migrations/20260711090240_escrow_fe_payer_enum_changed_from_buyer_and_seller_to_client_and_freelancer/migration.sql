/*
  Warnings:

  - The values [BUYER,SELLER] on the enum `EscrowFeePayer` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum

ALTER TYPE "EscrowFeePayer" RENAME VALUE 'BUYER' TO 'CLIENT';
ALTER TYPE "EscrowFeePayer" RENAME VALUE 'SELLER' TO 'FREELANCER';
