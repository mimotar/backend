-- Milestones now have an explicit order and auditable lifecycle timestamps.
ALTER TABLE "Milestone"
ADD COLUMN "sequence" INTEGER,
ADD COLUMN "activatedAt" TIMESTAMP(3),
ADD COLUMN "completedAt" TIMESTAMP(3),
ADD COLUMN "releasedAt" TIMESTAMP(3);

WITH ordered_milestones AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "transaction_id" ORDER BY "id")::INTEGER AS "sequence"
  FROM "Milestone"
)
UPDATE "Milestone" AS milestone
SET "sequence" = ordered_milestones."sequence"
FROM ordered_milestones
WHERE milestone."id" = ordered_milestones."id";

ALTER TABLE "Milestone" ALTER COLUMN "sequence" SET NOT NULL;

CREATE UNIQUE INDEX "Milestone_transaction_id_sequence_key"
ON "Milestone"("transaction_id", "sequence");

CREATE INDEX "Milestone_transaction_id_status_idx"
ON "Milestone"("transaction_id", "status");

-- A transaction can retain dispute history and milestone projects can have one
-- dispute per milestone rather than one dispute for the entire project.
CREATE TYPE "DisputeResolution" AS ENUM ('RELEASE_TO_SELLER');

DROP INDEX IF EXISTS "Dispute_transactionId_chatId_key";
DROP INDEX IF EXISTS "Dispute_transactionId_key";

ALTER TABLE "Dispute"
ADD COLUMN "milestoneId" INTEGER,
ADD COLUMN "resolution" "DisputeResolution",
ADD COLUMN "resolvedAt" TIMESTAMP(3),
ADD COLUMN "resolvedById" INTEGER;

CREATE INDEX "Dispute_transactionId_status_idx"
ON "Dispute"("transactionId", "status");

CREATE INDEX "Dispute_milestoneId_status_idx"
ON "Dispute"("milestoneId", "status");

-- PostgreSQL partial indexes enforce one active dispute for a transaction scope
-- and one active dispute for each milestone while retaining closed history.
CREATE UNIQUE INDEX "Dispute_active_transaction_scope_key"
ON "Dispute"("transactionId")
WHERE "milestoneId" IS NULL AND "status" = 'ongoing';

CREATE UNIQUE INDEX "Dispute_active_milestone_scope_key"
ON "Dispute"("milestoneId")
WHERE "milestoneId" IS NOT NULL AND "status" = 'ongoing';

ALTER TABLE "Dispute"
ADD CONSTRAINT "Dispute_milestoneId_fkey"
FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Dispute"
ADD CONSTRAINT "Dispute_resolvedById_fkey"
FOREIGN KEY ("resolvedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Earnings become a release ledger. releaseKey makes retries idempotent and
-- milestone_id prevents a milestone from being paid more than once.
DROP INDEX IF EXISTS "Earnings_transaction_id_key";

ALTER TABLE "Earnings"
ADD COLUMN "milestone_id" INTEGER,
ADD COLUMN "releaseKey" TEXT;

UPDATE "Earnings"
SET "releaseKey" = 'transaction:' || "transaction_id"::TEXT
WHERE "releaseKey" IS NULL;

ALTER TABLE "Earnings" ALTER COLUMN "releaseKey" SET NOT NULL;

CREATE UNIQUE INDEX "Earnings_milestone_id_key" ON "Earnings"("milestone_id");
CREATE UNIQUE INDEX "Earnings_releaseKey_key" ON "Earnings"("releaseKey");
CREATE INDEX "Earnings_transaction_id_idx" ON "Earnings"("transaction_id");

ALTER TABLE "Earnings"
ADD CONSTRAINT "Earnings_milestone_id_fkey"
FOREIGN KEY ("milestone_id") REFERENCES "Milestone"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
