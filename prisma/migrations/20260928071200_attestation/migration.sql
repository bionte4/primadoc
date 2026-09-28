CREATE TABLE "Attestation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attestation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Attestation_userId_policyId_key" ON "Attestation"("userId", "policyId");
CREATE INDEX "Attestation_policyId_idx" ON "Attestation"("policyId");

ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
