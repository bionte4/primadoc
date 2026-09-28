-- Review deadline, backup approver, and in-app reminders.
ALTER TABLE "User" ADD COLUMN "backupApproverId" TEXT;

ALTER TABLE "Policy" ADD COLUMN "reviewStartedAt" TIMESTAMP(3);
ALTER TABLE "Policy" ADD COLUMN "remindedAt" TIMESTAMP(3);
ALTER TABLE "Policy" ADD COLUMN "escalatedAt" TIMESTAMP(3);
ALTER TABLE "Policy" ADD COLUMN "primaryApproverId" TEXT;
ALTER TABLE "Policy" ADD COLUMN "delegatedApproverId" TEXT;

ALTER TABLE "User"
  ADD CONSTRAINT "User_backupApproverId_fkey"
  FOREIGN KEY ("backupApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Policy"
  ADD CONSTRAINT "Policy_primaryApproverId_fkey"
  FOREIGN KEY ("primaryApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Policy"
  ADD CONSTRAINT "Policy_delegatedApproverId_fkey"
  FOREIGN KEY ("delegatedApproverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Policy_status_reviewStartedAt_idx" ON "Policy"("status", "reviewStartedAt");

CREATE TABLE "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "policyId" TEXT,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Notification"
  ADD CONSTRAINT "Notification_policyId_fkey"
  FOREIGN KEY ("policyId") REFERENCES "Policy"("id") ON DELETE SET NULL ON UPDATE CASCADE;
