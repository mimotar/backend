/*
  Warnings:

  - The values [BUYER,SELLER] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
ALTER TYPE "Role" RENAME VALUE 'BUYER' TO 'CLIENT';
ALTER TYPE "Role" RENAME VALUE 'SELLER' TO 'FREELANCER';
