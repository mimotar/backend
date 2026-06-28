-- The earlier projectDeadline field was scoped too narrowly to milestone
-- projects. Rename it to the transaction-wide deadline used by every type.
ALTER TABLE "Transaction"
DROP CONSTRAINT IF EXISTS "Transaction_milestone_project_deadline_check";

ALTER TABLE "Transaction"
RENAME COLUMN "projectDeadline" TO "deadline";

-- Existing non-milestone transactions did not collect an expected completion
-- date. Their approval-link expiry is the only safe historical fallback.
UPDATE "Transaction"
SET "deadline" = "expiresAt"
WHERE "deadline" IS NULL;

ALTER TABLE "Transaction" ALTER COLUMN "deadline" SET NOT NULL;
