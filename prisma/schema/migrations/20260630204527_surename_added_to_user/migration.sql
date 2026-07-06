-- AlterTable
ALTER TABLE "User" ADD COLUMN "sureName" TEXT;

UPDATE "User"
SET "sureName" = "lastName"
WHERE "sureName" IS NULL;

ALTER TABLE "User" ALTER COLUMN "sureName" SET NOT NULL;
