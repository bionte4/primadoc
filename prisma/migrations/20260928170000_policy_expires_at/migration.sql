-- Optional expiry date for an approved document. Empty means it does not expire.
ALTER TABLE "Policy" ADD COLUMN "expiresAt" TIMESTAMP(3);
CREATE INDEX "Policy_status_expiresAt_idx" ON "Policy"("status", "expiresAt");
