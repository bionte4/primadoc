import type { PolicyStatus, Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
};

export function canCreatePolicy(role: Role) {
  return role === "STAFF" || role === "ADMIN";
}

export function canManageUsers(role: Role) {
  return role === "ADMIN";
}

export function canAttest(role: Role) {
  return role === "STAFF";
}

export function canAccessApprovalQueue(role: Role) {
  return role === "REVIEWER" || role === "APPROVER" || role === "ADMIN";
}

export function canEditPolicy(
  role: Role,
  status: PolicyStatus,
  isAuthor: boolean,
) {
  if (status !== "DRAFT" && status !== "REJECTED") return false;
  if (role === "ADMIN") return true;
  return role === "STAFF" && isAuthor;
}

export function canSubmitForReview(
  _role: Role,
  status: PolicyStatus,
  isAuthor: boolean,
) {
  return status === "DRAFT" && isAuthor;
}

/** Reviewers leave a recommendation while a policy is in review. */
export function canAddReviewNote(role: Role, status: PolicyStatus) {
  return status === "IN_REVIEW" && (role === "REVIEWER" || role === "ADMIN");
}

export function canDecide(role: Role, status: PolicyStatus) {
  return status === "IN_REVIEW" && role === "APPROVER";
}

export function canArchive(
  role: Role,
  status: PolicyStatus,
  isAuthor: boolean,
) {
  if (status === "ARCHIVED" || status === "DRAFT") return false;
  if (role === "ADMIN") return true;
  return isAuthor && (status === "APPROVED" || status === "REJECTED");
}

/** Opens a new draft revision from an approved policy and bumps the version. */
export function canRevise(
  role: Role,
  status: PolicyStatus,
  isAuthor: boolean,
) {
  if (status !== "APPROVED") return false;
  if (role === "ADMIN") return true;
  return role === "STAFF" && isAuthor;
}

export function canDeletePolicy(
  role: Role,
  status: PolicyStatus,
  isAuthor: boolean,
) {
  if (status !== "DRAFT" && status !== "REJECTED") return false;
  if (role === "ADMIN") return true;
  return role === "STAFF" && isAuthor;
}

export function canViewPolicy(
  role: Role,
  status: PolicyStatus,
  isAuthor: boolean,
) {
  if (role !== "STAFF") return true;
  return isAuthor || status === "APPROVED";
}
