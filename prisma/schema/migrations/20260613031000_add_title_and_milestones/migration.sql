-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "title" VARCHAR(200) NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "Milestone" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "files" JSONB,
    "status" "StatusEnum" NOT NULL DEFAULT 'CREATED',

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
