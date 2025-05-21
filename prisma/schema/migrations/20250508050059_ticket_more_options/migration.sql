/*
  Warnings:

  - The values [CANCEL] on the enum `StatusEnum` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StatusEnum_new" AS ENUM ('CREATED', 'APPROVED', 'ONGOING', 'COMPLETED', 'DISPUTE', 'REJECTED', 'CANCELED');
ALTER TABLE "Transaction" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Transaction" ALTER COLUMN "status" TYPE "StatusEnum_new" USING ("status"::text::"StatusEnum_new");
ALTER TYPE "StatusEnum" RENAME TO "StatusEnum_old";
ALTER TYPE "StatusEnum_new" RENAME TO "StatusEnum";
DROP TYPE "StatusEnum_old";
ALTER TABLE "Transaction" ALTER COLUMN "status" SET DEFAULT 'ONGOING';
COMMIT;
