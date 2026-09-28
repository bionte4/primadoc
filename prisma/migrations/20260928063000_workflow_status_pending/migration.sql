-- Workflow approvals record a decision, not the policy archive state.
CREATE TYPE "WorkflowStepStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "WorkflowApproval" ALTER COLUMN "status" TYPE "WorkflowStepStatus_new" USING (
  CASE "status"::text
    WHEN 'SUBMITTED' THEN 'PENDING'
    WHEN 'APPROVED' THEN 'APPROVED'
    WHEN 'REJECTED' THEN 'REJECTED'
    ELSE 'PENDING'
  END
)::"WorkflowStepStatus_new";

DROP TYPE "WorkflowStepStatus";

ALTER TYPE "WorkflowStepStatus_new" RENAME TO "WorkflowStepStatus";
