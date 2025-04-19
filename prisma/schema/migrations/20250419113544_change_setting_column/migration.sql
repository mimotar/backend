/*
  Warnings:

  - You are about to drop the column `accountId` on the `Setting` table. All the data in the column will be lost.
  - You are about to drop the column `securityQuestionId` on the `Setting` table. All the data in the column will be lost.
  - You are about to drop the `SettingAccountStatus` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `securityQuestions` to the `Setting` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'DISABLED', 'DELETED');

-- DropForeignKey
ALTER TABLE "Setting" DROP CONSTRAINT "Setting_accountId_fkey";

-- DropIndex
DROP INDEX "Setting_accountId_key";

-- AlterTable
ALTER TABLE "Setting" DROP COLUMN "accountId",
DROP COLUMN "securityQuestionId",
ADD COLUMN     "accountStatus" "AccountStatus",
ADD COLUMN     "securityQuestions" JSONB NOT NULL,
ALTER COLUMN "notificationPreference" SET DEFAULT 'EMAIL',
ALTER COLUMN "twoFactorAuth" SET DEFAULT false;

-- DropTable
DROP TABLE "SettingAccountStatus";
