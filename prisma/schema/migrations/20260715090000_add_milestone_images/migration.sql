-- Add a normalized store for milestone images. The legacy Milestone.files
-- column is intentionally retained so this migration is backward compatible.
CREATE TABLE "MilestoneImage" (
    "id" SERIAL NOT NULL,
    "milestoneId" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneImage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MilestoneImage_publicId_key"
ON "MilestoneImage"("publicId");

CREATE INDEX "MilestoneImage_milestoneId_idx"
ON "MilestoneImage"("milestoneId");

ALTER TABLE "MilestoneImage"
ADD CONSTRAINT "MilestoneImage_milestoneId_fkey"
FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Safely copy legacy entries that contain both values needed for display and
-- Cloudinary deletion. Existing JSON remains untouched for older clients.
INSERT INTO "MilestoneImage" ("milestoneId", "url", "publicId")
SELECT
    milestone."id",
    attachment->>'fileUrl',
    attachment->>'fileId'
FROM "Milestone" AS milestone
CROSS JOIN LATERAL json_array_elements(
    CASE
        WHEN json_typeof(milestone."files") = 'array' THEN milestone."files"
        ELSE '[]'::json
    END
) AS attachment
WHERE NULLIF(attachment->>'fileUrl', '') IS NOT NULL
  AND NULLIF(attachment->>'fileId', '') IS NOT NULL
  AND attachment->>'fileType' = 'image'
ON CONFLICT ("publicId") DO NOTHING;
