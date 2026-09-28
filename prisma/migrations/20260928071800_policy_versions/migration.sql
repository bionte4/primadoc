-- Each saved revision is its own Policy row. Older rows stay readable.
ALTER TABLE "Policy" ADD COLUMN "versionGroupId" TEXT;
UPDATE "Policy" SET "versionGroupId" = "id";
ALTER TABLE "Policy" ALTER COLUMN "versionGroupId" SET NOT NULL;

ALTER TABLE "Policy" ADD COLUMN "isCurrent" BOOLEAN NOT NULL DEFAULT true;

DROP INDEX "Policy_documentNumber_key";
CREATE UNIQUE INDEX "Policy_documentNumber_version_key" ON "Policy"("documentNumber", "version");
CREATE INDEX "Policy_versionGroupId_idx" ON "Policy"("versionGroupId");
CREATE INDEX "Policy_isCurrent_idx" ON "Policy"("isCurrent");
