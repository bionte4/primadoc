import type { Department, PolicyStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isDepartment, isPolicyType } from "@/lib/document-kind";
import { jakartaToday } from "@/lib/expiry";
import type { SessionUser } from "@/lib/rbac";

const monitorSelect = {
  id: true,
  title: true,
  documentNumber: true,
  status: true,
  authorId: true,
  expiresAt: true,
  updatedAt: true,
} as const;

export type MonitorItem = {
  id: string;
  title: string;
  documentNumber: string;
  status: PolicyStatus;
  authorId: string;
  expiresAt: Date | null;
  updatedAt: Date;
};

export async function listPendingReviews(user: SessionUser, documentType = "", department = "") {
  return prisma.policy.findMany({
    where: {
      AND: [
        { isCurrent: true, status: "IN_REVIEW" },
        visibility(user),
        typeFilter(documentType),
        departmentFilter(department),
      ],
    },
    select: monitorSelect,
    orderBy: { updatedAt: "desc" },
    take: 5,
  });
}

export async function listExpiringPolicies(user: SessionUser, documentType = "", department = "") {
  return prisma.policy.findMany({
    where: {
      AND: [
        {
          isCurrent: true,
          status: "APPROVED",
          expiresAt: { gte: jakartaToday(0), lte: jakartaToday(30) },
        },
        visibility(user),
        typeFilter(documentType),
        departmentFilter(department),
      ],
    },
    select: monitorSelect,
    orderBy: { expiresAt: "asc" },
    take: 5,
  });
}

function visibility(user: SessionUser) {
  if (user.role !== "STAFF") return {};
  return { OR: [{ authorId: user.id }, { status: "APPROVED" as const }] };
}

function typeFilter(documentType: string) {
  return isPolicyType(documentType) ? { type: documentType } : {};
}

function departmentFilter(department: string) {
  return isDepartment(department) ? { department: department as Department } : {};
}
