/*
  Warnings:

  - The values [ongoing,dispute,cancel,completed] on the enum `Status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `status_id` on the `Transaction` table. All the data in the column will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "Status_new" AS ENUM ('ONGOING', 'DISPUTE', 'CANCEL', 'COMPLETED');
ALTER TABLE "Transaction" ALTER COLUMN "status_id" DROP DEFAULT;
ALTER TABLE "Transaction" ALTER COLUMN "status" TYPE "Status_new" USING ("status"::text::"Status_new");
ALTER TYPE "Status" RENAME TO "Status_old";
ALTER TYPE "Status_new" RENAME TO "Status";
DROP TYPE "Status_old";
COMMIT;

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "status_id",
ADD COLUMN     "status" "Status" NOT NULL DEFAULT 'ONGOING';
