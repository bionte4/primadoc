import type { PolicyStatus, Role, WorkflowStepStatus } from "@prisma/client";

export const POLICY_CATEGORIES = [
  "SDM",
  "Keuangan",
  "Operasional",
  "Kepatuhan",
  "TI",
  "Umum",
] as const;

export type PolicyCategory = (typeof POLICY_CATEGORIES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  STAFF: "Staf",
  REVIEWER: "Reviewer",
  APPROVER: "Approver",
  ADMIN: "Admin",
};

export const STATUS_LABEL: Record<PolicyStatus, string> = {
  DRAFT: "Draf",
  IN_REVIEW: "Dalam review",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  ARCHIVED: "Diarsipkan",
};

export const WORKFLOW_LABEL: Record<WorkflowStepStatus, string> = {
  PENDING: "Menunggu persetujuan",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
};

export const AUDIT_LABEL: Record<string, string> = {
  CREATE: "Dibuat",
  UPDATE: "Diperbarui",
  SUBMIT_REVIEW: "Diajukan",
  APPROVE: "Disetujui",
  REJECT: "Ditolak",
  ARCHIVE: "Diarsipkan",
  REVISE: "Revisi dibuka",
  REVIEW_NOTE: "Catatan review",
  DELETE: "Dihapus",
};

export const POLICY_STATUSES = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
] as const satisfies readonly PolicyStatus[];

export const DEMO_PASSWORD = "Password123!";
