-- Document kind becomes type, and the parent link becomes a row relation.
ALTER TYPE "DocumentKind" RENAME TO "PolicyType";
ALTER TYPE "PolicyType" RENAME VALUE 'WORK_INSTRUCTION' TO 'TECHNICAL_GUIDE';

ALTER TABLE "Policy" RENAME COLUMN "kind" TO "type";
ALTER INDEX "Policy_kind_idx" RENAME TO "Policy_type_idx";

ALTER TABLE "Policy" ADD COLUMN "parentId" TEXT;

UPDATE "Policy" AS child
SET "parentId" = parent."id"
FROM "Policy" AS parent
WHERE child."parentGroupId" IS NOT NULL
  AND child."parentGroupId" = parent."versionGroupId"
  AND parent."isCurrent" = true;

ALTER TABLE "Policy"
  ADD CONSTRAINT "Policy_parentId_fkey"
  FOREIGN KEY ("parentId") REFERENCES "Policy"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Policy_parentId_idx" ON "Policy"("parentId");

DROP INDEX "Policy_parentGroupId_idx";
ALTER TABLE "Policy" DROP COLUMN "parentGroupId";
