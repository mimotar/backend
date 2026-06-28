ALTER TABLE "Transaction" ADD COLUMN "projectDeadline" TIMESTAMP(3);

-- Existing milestone projects inherit the latest milestone deadline. Projects
-- without milestones fall back to the existing transaction link expiry so the
-- new project-deadline invariant can be introduced without losing records.
UPDATE "Transaction" AS transaction
SET "projectDeadline" = COALESCE(
  (
    SELECT MAX(milestone."deadline")
    FROM "Milestone" AS milestone
    WHERE milestone."transaction_id" = transaction."id"
  ),
  transaction."expiresAt"
)
WHERE transaction."transactionType" = 'MILESTONE_BASED_PROJECT';

ALTER TABLE "Transaction"
ADD CONSTRAINT "Transaction_milestone_project_deadline_check"
CHECK (
  "transactionType" <> 'MILESTONE_BASED_PROJECT'
  OR "projectDeadline" IS NOT NULL
);

CREATE TABLE "DeadlineExtension" (
  "id" SERIAL NOT NULL,
  "transactionId" INTEGER NOT NULL,
  "milestoneId" INTEGER,
  "previousDeadline" TIMESTAMP(3) NOT NULL,
  "newDeadline" TIMESTAMP(3) NOT NULL,
  "reason" VARCHAR(500),
  "extendedById" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DeadlineExtension_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DeadlineExtension_transactionId_createdAt_idx"
ON "DeadlineExtension"("transactionId", "createdAt");

CREATE INDEX "DeadlineExtension_milestoneId_createdAt_idx"
ON "DeadlineExtension"("milestoneId", "createdAt");

CREATE INDEX "DeadlineExtension_extendedById_idx"
ON "DeadlineExtension"("extendedById");

ALTER TABLE "DeadlineExtension"
ADD CONSTRAINT "DeadlineExtension_transactionId_fkey"
FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeadlineExtension"
ADD CONSTRAINT "DeadlineExtension_milestoneId_fkey"
FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DeadlineExtension"
ADD CONSTRAINT "DeadlineExtension_extendedById_fkey"
FOREIGN KEY ("extendedById") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
