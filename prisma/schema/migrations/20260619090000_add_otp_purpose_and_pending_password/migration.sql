-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'CHANGE_PASSWORD');

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "otpPurpose" "OtpPurpose",
ADD COLUMN "pendingPasswordHash" TEXT;
