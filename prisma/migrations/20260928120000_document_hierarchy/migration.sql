-- Kebijakan, prosedur, and petunjuk teknis share one document record.
CREATE TYPE "DocumentKind" AS ENUM ('POLICY', 'PROCEDURE', 'WORK_INSTRUCTION');

ALTER TABLE "Policy" ADD COLUMN "kind" "DocumentKind" NOT NULL DEFAULT 'POLICY';
ALTER TABLE "Policy" ADD COLUMN "parentGroupId" TEXT;
ALTER TABLE "Policy" ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Policy_kind_idx" ON "Policy"("kind");
CREATE INDEX "Policy_parentGroupId_idx" ON "Policy"("parentGroupId");
