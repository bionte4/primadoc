"use server";

import { unlink } from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  canAddReviewNote,
  canArchive,
  canCreatePolicy,
  canDecide,
  canDeletePolicy,
  canEditPolicy,
  canRevise,
  canSubmitForReview,
  canViewPolicy,
  type SessionUser,
} from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import { savePolicyFile, isSafeStoredName, uploadsDirectory, type StoredFile } from "@/lib/upload";
import { compareVersionsDesc, formatVersion, nextMajorVersion, nextMinorVersion } from "@/lib/version";
import { childType, isDepartment, isPolicyType, parentTypeFor } from "@/lib/document-kind";
import { documentYear, nextDocumentNumber } from "@/lib/document-number";
import { findPrimaryApproverId } from "@/lib/review-escalation";
import { parseExpiryDate } from "@/lib/expiry";
import { searchPolicies, snippetParts } from "@/lib/policy-search";
import { POLICY_STATUSES } from "@/lib/constants";
import { getDictionary, thrownFileError } from "@/lib/i18n";
import {
  createNotesSchema,
  createPolicyFormSchema,
  createRequiredNotesSchema,
} from "@/lib/validators/policy";
import type { Department, PolicyStatus, PolicyType } from "@prisma/client";

export type ActionState = {
  error?: string;
  ok?: boolean;
};

async function text() {
  return (await getDictionary()).t;
}

const policyInclude = {
  author: { select: { id: true, name: true, email: true, role: true } },
  approvals: {
    include: { approver: { select: { id: true, name: true, role: true } } },
    orderBy: { stepOrder: "asc" as const },
  },
  primaryApprover: { select: { id: true, name: true } },
  delegatedApprover: { select: { id: true, name: true } },
  auditLogs: {
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { timestamp: "desc" as const },
  },
} satisfies Prisma.PolicyInclude;

export type PolicyDetail = Prisma.PolicyGetPayload<{
  include: typeof policyInclude;
}>;

export async function listPolicies(
  user: SessionUser,
  query: string,
  status: string,
  documentType = "",
  department = "",
  scope = "",
) {
  const visibility: Prisma.PolicyWhereInput =
    user.role === "STAFF"
      ? { OR: [{ authorId: user.id }, { status: "APPROVED" }] }
      : {};
  const mineFilter: Prisma.PolicyWhereInput = scope === "mine" ? { authorId: user.id } : {};

  const statusFilter: Prisma.PolicyWhereInput = isPolicyStatus(status) ? { status } : {};
  const typeFilter: Prisma.PolicyWhereInput = isPolicyType(documentType) ? { type: documentType } : {};
  const departmentFilter: Prisma.PolicyWhereInput = isDepartment(department) ? { department } : {};

  const hits = query ? await searchPolicies(query) : null;
  if (hits && hits.length === 0) return [];
  const rank = new Map(hits?.map((hit, index) => [hit.id, index]));

  const policies = await prisma.policy.findMany({
    where: {
      AND: [
        { isCurrent: true },
        visibility,
        mineFilter,
        statusFilter,
        typeFilter,
        departmentFilter,
        ...(hits ? [{ id: { in: hits.map((hit) => hit.id) } }] : []),
      ],
    },
    omit: { contentText: true },
    include: { author: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  if (!hits) {
    return policies.map((policy) => ({ ...policy, snippet: null }));
  }

  return policies
    .slice()
    .sort((left, right) => (rank.get(left.id) ?? 0) - (rank.get(right.id) ?? 0))
    .map((policy) => ({
      ...policy,
      snippet: snippetParts(hits.find((hit) => hit.id === policy.id)?.snippet ?? ""),
    }));
}

export async function countPolicies(
  user: SessionUser,
  documentType = "",
  department = "",
  scope = "",
) {
  const visibility: Prisma.PolicyWhereInput =
    user.role === "STAFF"
      ? { OR: [{ authorId: user.id }, { status: "APPROVED" }] }
      : {};
  const mineFilter: Prisma.PolicyWhereInput = scope === "mine" ? { authorId: user.id } : {};
  const typeFilter: Prisma.PolicyWhereInput = isPolicyType(documentType) ? { type: documentType } : {};
  const departmentFilter: Prisma.PolicyWhereInput = isDepartment(department) ? { department } : {};

  const grouped = await prisma.policy.groupBy({
    by: ["status"],
    where: { AND: [{ isCurrent: true }, visibility, mineFilter, typeFilter, departmentFilter] },
    _count: { _all: true },
  });

  const counts = Object.fromEntries(
    POLICY_STATUSES.map((status) => [status, 0]),
  ) as Record<PolicyStatus, number>;

  for (const row of grouped) {
    counts[row.status] = row._count._all;
  }

  return counts;
}

/** In-review queue. `mine` keeps only the current user's assignments or review notes. */
export async function listApprovalQueue(user: SessionUser, mine: boolean) {
  const policies = await listPolicies(user, "", "IN_REVIEW");
  if (!mine) return policies;

  if (user.role === "APPROVER") {
    return policies.filter((policy) => {
      if (policy.delegatedApproverId) return policy.delegatedApproverId === user.id;
      if (policy.primaryApproverId) return policy.primaryApproverId === user.id;
      return false;
    });
  }

  const notes = await prisma.workflowApproval.findMany({
    where: { approverId: user.id, policy: { isCurrent: true, status: "IN_REVIEW" } },
    select: { policyId: true },
  });
  const ids = new Set(notes.map((note) => note.policyId));
  return policies.filter((policy) => ids.has(policy.id));
}

export async function getPolicyForUser(user: SessionUser, id: string) {
  const policy = await prisma.policy.findUnique({
    where: { id },
    include: policyInclude,
  });

  if (!policy) return null;
  if (!canViewPolicy(user.role, policy.status, policy.authorId === user.id)) {
    return null;
  }
  return policy;
}

export async function createPolicy(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  if (!canCreatePolicy(user.role)) {
    return { error: (await text()).errors.noCreateAccess };
  }

  const t = await text();
  const parsed = createPolicyFormSchema(t.validation).safeParse({
    title: formData.get("title"),
    documentNumber: String(formData.get("documentNumber") ?? ""),
    category: formData.get("category"),
    description: formData.get("description"),
    type: formData.get("type") || "POLICY",
    department: formData.get("department") || "CORP",
    parentId: String(formData.get("parentId") ?? "") || undefined,
    expiresAt: String(formData.get("expiresAt") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? (await text()).errors.invalidData };
  }
  const expiresAt = expiryFromForm(parsed.data.expiresAt);
  if (expiresAt === "invalid") return { error: (await text()).errors.invalidExpiry };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: (await text()).errors.fileRequired };
  }

  let stored: StoredFile;
  try {
    stored = await savePolicyFile(file);
  } catch (error) {
    return { error: error instanceof Error ? thrownFileError(error.message, await text()) : (await text()).errors.uploadFailed };
  }

  try {
    const policy = await prisma.$transaction(async (tx) => {
      const documentType = parsed.data.type;
      const requestedParentId = parsed.data.parentId?.trim() ?? "";
      if (documentType !== "POLICY" && !requestedParentId) {
        throw new Error("INDUK_WAJIB");
      }
      const parent = requestedParentId
        ? await tx.policy.findUnique({ where: { id: requestedParentId } })
        : null;
      const expectedParent = parentTypeFor(documentType);
      if (
        expectedParent &&
        (!parent?.isCurrent || parent.status !== "APPROVED" || parent.type !== expectedParent)
      ) {
        throw new Error("INDUK_TIDAK_SIAP");
      }
      if (!expectedParent && parent) {
        throw new Error("INDUK_TIDAK_SIAP");
      }

      const category = parent ? parent.category : parsed.data.category;
      const department = parent ? parent.department : parsed.data.department;
      const documentNumber = await allocateDocumentNumber(tx, department, documentType);
      const taken = await tx.policy.findFirst({
        where: { documentNumber, isCurrent: true },
        select: { id: true },
      });
      if (taken) {
        throw new Error("NOMOR_TERPAKAI");
      }

      const created = await tx.policy.create({
        data: {
          title: parsed.data.title,
          documentNumber,
          category,
          description: parsed.data.description,
          fileUrl: stored.storedName,
          fileName: stored.originalName,
          contentText: stored.contentText || null,
          version: "1.0",
          versionGroupId: "pending",
          type: documentType,
          department,
          parentId: parent?.id ?? null,
          status: "DRAFT",
          expiresAt,
          authorId: user.id,
        },
      });
      await tx.policy.update({
        where: { id: created.id },
        data: { versionGroupId: created.id },
      });

      await tx.auditLog.create({
        data: {
          userId: user.id,
          policyId: created.id,
          action: "CREATE",
          details: `Membuat draf ${created.documentNumber} ${formatVersion(created.version)}.`,
        },
      });

      return created;
    });

    revalidatePath("/policies");
    redirect(`/policies/${policy.id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error && error.message === "INDUK_WAJIB") {
      return { error: (await text()).errors.parentRequired };
    }
    if (error instanceof Error && error.message === "INDUK_TIDAK_SIAP") {
      return { error: (await text()).errors.parentMustBeApproved };
    }
    if (isTakenNumber(error) || isUniqueViolation(error)) {
      return { error: (await text()).errors.numberTaken };
    }
    return { error: (await text()).errors.saveFailed };
  }
}

export async function updatePolicy(
  policyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!existing) return { error: (await text()).errors.policyNotFound };

  if (!existing.isCurrent) {
    return { error: (await text()).errors.onlyCurrentEditable };
  }
  if (!canEditPolicy(user.role, existing.status, existing.authorId === user.id)) {
    return { error: (await text()).errors.cannotEditStatus };
  }

  const t = await text();
  const parsed = createPolicyFormSchema(t.validation).safeParse({
    title: formData.get("title"),
    documentNumber: String(formData.get("documentNumber") ?? ""),
    category: formData.get("category"),
    description: formData.get("description"),
    type: existing.type,
    department: formData.get("department") || existing.department,
    parentId: String(formData.get("parentId") ?? "") || undefined,
    expiresAt: String(formData.get("expiresAt") ?? ""),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? (await text()).errors.invalidData };
  }
  const expiresAt = expiryFromForm(parsed.data.expiresAt);
  if (expiresAt === "invalid") return { error: (await text()).errors.invalidExpiry };

  const file = formData.get("file");
  let stored: StoredFile | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      stored = await savePolicyFile(file);
    } catch (error) {
      return {
        error: error instanceof Error ? thrownFileError(error.message, await text()) : (await text()).errors.uploadFailed,
      };
    }
  }

  const bump = formData.get("versionBump") === "major" ? "major" : "minor";
  const version =
    bump === "major" ? nextMajorVersion(existing.version) : nextMinorVersion(existing.version);
  const documentNumber = existing.documentNumber;
  const requestedParentId = parsed.data.parentId?.trim() ?? "";

  try {
    const created = await prisma.$transaction(async (tx) => {
      let parentId = existing.type === "POLICY" ? null : existing.parentId;
      let category = existing.type === "POLICY" ? parsed.data.category : existing.category;
      let department = existing.type === "POLICY" ? parsed.data.department : existing.department;
      if (existing.type !== "POLICY") {
        const parent = requestedParentId
          ? await tx.policy.findUnique({ where: { id: requestedParentId } })
          : null;
        const expectedParent = parentTypeFor(existing.type);
        if (
          !parent?.isCurrent ||
          parent.status !== "APPROVED" ||
          parent.type !== expectedParent ||
          parent.id === existing.id
        ) {
          throw new Error("INDUK_TIDAK_SIAP");
        }
        parentId = parent.id;
        category = parent.category;
        department = parent.department;
      }

      const taken = await tx.policy.findFirst({
        where: {
          documentNumber,
          isCurrent: true,
          NOT: { versionGroupId: existing.versionGroupId },
        },
        select: { id: true },
      });
      if (taken) throw new Error("NOMOR_TERPAKAI");

      await tx.policy.update({
        where: { id: existing.id },
        data: { isCurrent: false },
      });

      const next = await tx.policy.create({
        data: {
          title: parsed.data.title,
          documentNumber,
          category,
          description: parsed.data.description,
          fileUrl: stored?.storedName ?? existing.fileUrl,
          fileName: stored?.originalName ?? existing.fileName,
          contentText: stored ? stored.contentText || null : existing.contentText,
          version,
          versionGroupId: existing.versionGroupId,
          type: existing.type,
          department,
          parentId,
          needsReview: false,
          isCurrent: true,
          status: "DRAFT",
          expiresAt,
          authorId: existing.authorId,
        },
      });
      await retargetChildren(tx, existing.id, next.id);

      await tx.auditLog.create({
        data: {
          userId: user.id,
          policyId: next.id,
          action: "UPDATE",
          details: `Menyimpan ${documentNumber} ${formatVersion(version)} dari ${formatVersion(existing.version)}.`,
        },
      });

      return next;
    });

    revalidatePath("/policies");
    revalidatePath("/dashboard");
    revalidatePath(`/policies/${policyId}`);
    revalidatePath(`/policies/${created.id}`);
    redirect(`/policies/${created.id}`);
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof Error && error.message === "INDUK_TIDAK_SIAP") {
      return { error: (await text()).errors.parentMustBeApproved };
    }
    if (isTakenNumber(error) || isUniqueViolation(error)) {
      return { error: (await text()).errors.numberTaken };
    }
    return { error: (await text()).errors.updateFailed };
  }
}

export async function submitForReview(
  policyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const notes = String(formData.get("notes") ?? "");
  const t = await text();
  const parsed = createNotesSchema(t.validation).safeParse({ notes });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? (await text()).errors.invalidNotes };
  }

  const result = await transitionPolicy({
    policyId,
    from: ["DRAFT"],
    to: "IN_REVIEW",
    step: "PENDING",
    action: "SUBMIT_REVIEW",
    notes: parsed.data.notes,
    authorize: (user, policy) =>
      canSubmitForReview(user.role, policy.status, policy.authorId === user.id),
    detail: (documentNumber) =>
      `Mengajukan ${documentNumber} untuk review.`,
  });

  return result;
}

export async function approvePolicy(
  policyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const notes = String(formData.get("notes") ?? "");
  const t = await text();
  const parsed = createNotesSchema(t.validation).safeParse({ notes });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? (await text()).errors.invalidNotes };
  }

  return transitionPolicy({
    policyId,
    from: ["IN_REVIEW"],
    to: "APPROVED",
    step: "APPROVED",
    action: "APPROVE",
    notes: parsed.data.notes,
    authorize: (user, policy) =>
      canDecide(user.role, policy.status, user.id, policy),
    detail: (documentNumber) => `Menyetujui ${documentNumber}.`,
  });
}

export async function rejectPolicy(
  policyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const notes = String(formData.get("notes") ?? "");
  const t = await text();
  const parsed = createRequiredNotesSchema(t.validation).safeParse({ notes });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? (await text()).errors.rejectReasonRequired };
  }

  return transitionPolicy({
    policyId,
    from: ["IN_REVIEW"],
    to: "DRAFT",
    step: "REJECTED",
    action: "REJECT",
    notes: parsed.data.notes,
    authorize: (user, policy) =>
      canDecide(user.role, policy.status, user.id, policy),
    detail: (documentNumber) =>
      `Menolak ${documentNumber}. Dokumen kembali menjadi draf.`,
  });
}

export async function archivePolicy(
  policyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const notes = String(formData.get("notes") ?? "");
  const t = await text();
  const parsed = createNotesSchema(t.validation).safeParse({ notes });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? (await text()).errors.invalidNotes };
  }

  return transitionPolicy({
    policyId,
    from: ["IN_REVIEW", "APPROVED", "REJECTED"],
    to: "ARCHIVED",
    action: "ARCHIVE",
    notes: parsed.data.notes,
    authorize: (user, policy) =>
      canArchive(user.role, policy.status, policy.authorId === user.id),
    detail: (documentNumber) => `Mengarsipkan ${documentNumber}.`,
  });
}

export async function revisePolicy(policyId: string): Promise<ActionState> {
  const user = await requireUser();
  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!policy) return { error: (await text()).errors.policyNotFound };
  if (!policy.isCurrent) {
    return { error: (await text()).errors.reviseOnlyCurrent };
  }
  if (!canRevise(user.role, policy.status, policy.authorId === user.id)) {
    return { error: (await text()).errors.reviseOnlyApproved };
  }

  const version = nextMinorVersion(policy.version);
  const created = await prisma.$transaction(async (tx) => {
    await tx.policy.update({
      where: { id: policy.id },
      data: { isCurrent: false },
    });
    const next = await tx.policy.create({
      data: {
        title: policy.title,
        documentNumber: policy.documentNumber,
        category: policy.category,
        description: policy.description,
        fileUrl: policy.fileUrl,
        fileName: policy.fileName,
        contentText: policy.contentText,
        version,
        versionGroupId: policy.versionGroupId,
        type: policy.type,
        department: policy.department,
        parentId: policy.parentId,
        expiresAt: policy.expiresAt,
        needsReview: false,
        isCurrent: true,
        status: "DRAFT",
        authorId: policy.authorId,
      },
    });
    await retargetChildren(tx, policy.id, next.id);
    await tx.auditLog.create({
      data: {
        userId: user.id,
        policyId: next.id,
        action: "REVISE",
        details: `Membuka ${policy.documentNumber} ${formatVersion(version)} dari ${formatVersion(policy.version)} yang tetap tersimpan.`,
      },
    });
    return next;
  });

  revalidatePath("/policies");
  revalidatePath("/dashboard");
  revalidatePath(`/policies/${policyId}`);
  revalidatePath(`/policies/${created.id}`);
  redirect(`/policies/${created.id}/edit`);
}

export async function deletePolicy(policyId: string): Promise<ActionState> {
  const user = await requireUser();
  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!policy) return { error: (await text()).errors.policyNotFound };
  if (!policy.isCurrent) {
    return { error: (await text()).errors.deleteOnlyCurrent };
  }
  if (!canDeletePolicy(user.role, policy.status, policy.authorId === user.id)) {
    return { error: (await text()).errors.deleteOnlyDraft };
  }

  try {
    await prisma.$transaction(async (tx) => {
    const previous = await tx.policy.findFirst({
      where: { versionGroupId: policy.versionGroupId, id: { not: policy.id } },
      orderBy: { updatedAt: "desc" },
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: "DELETE",
        details: `Menghapus ${policy.documentNumber} ${formatVersion(policy.version)} (${policy.title}).`,
      },
    });
    if (previous) {
      await retargetChildren(tx, policy.id, previous.id);
    } else {
      const children = await tx.policy.count({ where: { parentId: policy.id } });
      if (children > 0) throw new Error("PUNYA_TURUNAN");
    }
    await tx.policy.delete({ where: { id: policy.id } });
    if (previous) {
      await tx.policy.update({
        where: { id: previous.id },
        data: { isCurrent: true },
      });
    }
  });
  } catch (error) {
    if (error instanceof Error && error.message === "PUNYA_TURUNAN") {
      return { error: (await text()).errors.hasChildren };
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return { error: (await text()).errors.hasChildren };
    }
    throw error;
  }

  if (policy.fileUrl && isSafeStoredName(policy.fileUrl)) {
    const stillUsed = await prisma.policy.count({ where: { fileUrl: policy.fileUrl } });
    if (stillUsed === 0) {
      await unlink(path.join(uploadsDirectory(), policy.fileUrl)).catch(() => undefined);
    }
  }

  revalidatePath("/policies");
  redirect("/policies");
}

export async function addReviewNote(
  policyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const t = await text();
  const parsed = createRequiredNotesSchema(t.validation).safeParse({
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? (await text()).errors.notesRequired };
  }

  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!policy) return { error: (await text()).errors.policyNotFound };
  if (!canAddReviewNote(user.role, policy.status)) {
    return { error: (await text()).errors.reviewNoteOnlyInReview };
  }

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      policyId,
      action: "REVIEW_NOTE",
      details: parsed.data.notes,
    },
  });

  revalidatePath(`/policies/${policyId}`);
  return { ok: true };
}

async function transitionPolicy(input: {
  policyId: string;
  from: PolicyStatus[];
  to: PolicyStatus;
  step?: "PENDING" | "APPROVED" | "REJECTED";
  action: string;
  notes?: string;
  authorize: (
    user: SessionUser,
    policy: {
      status: PolicyStatus;
      authorId: string;
      documentNumber: string;
      primaryApproverId: string | null;
      delegatedApproverId: string | null;
    },
  ) => boolean;
  detail: (documentNumber: string) => string;
}): Promise<ActionState> {
  const user = await requireUser();
  const policy = await prisma.policy.findUnique({ where: { id: input.policyId } });
  if (!policy) return { error: (await text()).errors.policyNotFound };
  if (!policy.isCurrent) {
    return { error: (await text()).errors.actionOnlyCurrent };
  }
  if (!input.from.includes(policy.status)) {
    return { error: (await text()).errors.statusBlocksAction };
  }
  if (!input.authorize(user, policy)) {
    return { error: (await text()).errors.noActionAccess };
  }

  const enteringReview = input.to === "IN_REVIEW";
  if (enteringReview && policy.parentId) {
    const allowed = await parentAllowsSubmission(policy.parentId);
    if (!allowed) {
      return { error: (await text()).errors.parentBeforeSubmit };
    }
  }

  const primaryApproverId = enteringReview ? await findPrimaryApproverId() : null;

  await prisma.$transaction(async (tx) => {
    let flaggedChildren = 0;
    if (input.to === "ARCHIVED") {
      const family = await tx.policy.findMany({
        where: { versionGroupId: policy.versionGroupId },
        select: { id: true },
      });
      const flagged = await tx.policy.updateMany({
        where: {
          parentId: { in: family.map((row) => row.id) },
          isCurrent: true,
          status: { not: "ARCHIVED" },
        },
        data: { needsReview: true },
      });
      flaggedChildren = flagged.count;
    }

    await tx.policy.update({
      where: { id: policy.id },
      data: {
        status: input.to,
        reviewStartedAt: enteringReview ? new Date() : null,
        remindedAt: null,
        escalatedAt: null,
        delegatedApproverId: null,
        primaryApproverId,
      },
    });

    if (input.step) {
      const latest = await tx.workflowApproval.aggregate({
        where: { policyId: policy.id },
        _max: { stepOrder: true },
      });

      await tx.workflowApproval.create({
        data: {
          policyId: policy.id,
          approverId: user.id,
          status: input.step,
          notes: input.notes || null,
          stepOrder: (latest._max.stepOrder ?? 0) + 1,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: user.id,
        policyId: policy.id,
        action: input.action,
        details: [
          input.detail(policy.documentNumber),
          flaggedChildren > 0 ? `${flaggedChildren} turunan ditandai perlu ditinjau.` : null,
          input.notes,
        ]
          .filter(Boolean)
          .join(" "),
      },
    });
  });

  revalidatePath("/policies");
  revalidatePath("/dashboard");
  revalidatePath("/approval");
  revalidatePath(`/policies/${policy.id}`);
  return { ok: true };
}

function isPolicyStatus(value: string): value is PolicyStatus {
  return (
    value === "DRAFT" ||
    value === "IN_REVIEW" ||
    value === "APPROVED" ||
    value === "REJECTED" ||
    value === "ARCHIVED"
  );
}

export async function listPolicyVersions(versionGroupId: string) {
  const versions = await prisma.policy.findMany({
    where: { versionGroupId },
    select: {
      id: true,
      title: true,
      documentNumber: true,
      version: true,
      status: true,
      isCurrent: true,
      updatedAt: true,
    },
  });
  return versions.sort((left, right) => compareVersionsDesc(left.version, right.version));
}

function isTakenNumber(error: unknown) {
  return error instanceof Error && error.message === "NOMOR_TERPAKAI";
}

function isUniqueViolation(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

async function allocateDocumentNumber(
  tx: Prisma.TransactionClient,
  department: Department,
  documentType: PolicyType,
) {
  const year = documentYear();
  const prefix = department;
  const typeCode = documentType === "POLICY" ? "POL" : documentType === "PROCEDURE" ? "PRO" : "JUK";
  const stem = `${prefix}/${typeCode}/`;
  const existing = await tx.policy.findMany({
    where: { documentNumber: { startsWith: stem, endsWith: `/${year}` } },
    select: { documentNumber: true },
  });
  return nextDocumentNumber(
    department,
    documentType,
    existing.map((row) => row.documentNumber),
    year,
  );
}

async function retargetChildren(tx: Prisma.TransactionClient, fromId: string, toId: string) {
  await tx.policy.updateMany({
    where: { parentId: fromId, isCurrent: true },
    data: { parentId: toId },
  });
}

async function parentAllowsSubmission(parentId: string) {
  const linked = await prisma.policy.findUnique({
    where: { id: parentId },
    select: { id: true, status: true, isCurrent: true, versionGroupId: true },
  });
  if (!linked) return false;
  const current = linked.isCurrent
    ? linked
    : await prisma.policy.findFirst({
        where: { versionGroupId: linked.versionGroupId, isCurrent: true },
        select: { id: true, status: true, isCurrent: true, versionGroupId: true },
      });
  if (!current || current.status === "ARCHIVED") return false;
  if (current.status === "APPROVED") return true;
  const approved = await prisma.policy.findFirst({
    where: {
      versionGroupId: current.versionGroupId,
      status: "APPROVED",
      NOT: { id: current.id },
    },
    select: { id: true },
  });
  return Boolean(approved);
}

export async function listParentOptions(user: SessionUser) {
  const visibility: Prisma.PolicyWhereInput =
    user.role === "STAFF"
      ? { OR: [{ authorId: user.id }, { status: "APPROVED" }] }
      : {};
  return prisma.policy.findMany({
    where: {
      AND: [
        { isCurrent: true, status: "APPROVED", type: { in: ["POLICY", "PROCEDURE"] } },
        visibility,
      ],
    },
    orderBy: { documentNumber: "asc" },
    select: {
      id: true,
      title: true,
      documentNumber: true,
      type: true,
      department: true,
      category: true,
    },
  });
}

export async function childDraftFor(user: SessionUser, parentId: string) {
  const parent = await getPolicyForUser(user, parentId);
  if (!parent?.isCurrent || parent.status !== "APPROVED") return null;
  const type = childType(parent.type);
  if (!type) return null;
  return {
    parentId: parent.id,
    parentTitle: parent.title,
    parentNumber: parent.documentNumber,
    parentType: parent.type,
    type,
    department: parent.department,
    category: parent.category,
  };
}

export async function listDocumentChildren(user: SessionUser, parentId: string) {
  const visibility: Prisma.PolicyWhereInput =
    user.role === "STAFF"
      ? { OR: [{ authorId: user.id }, { status: "APPROVED" }] }
      : {};
  return prisma.policy.findMany({
    where: { AND: [{ parentId, isCurrent: true }, visibility] },
    orderBy: { documentNumber: "asc" },
    select: {
      id: true,
      title: true,
      documentNumber: true,
      type: true,
      status: true,
      version: true,
      needsReview: true,
    },
  });
}

export async function listDocumentAncestors(parentId: string | null) {
  const chain: {
    id: string;
    title: string;
    documentNumber: string;
    type: PolicyType;
    status: PolicyStatus;
    authorId: string;
  }[] = [];
  let currentId = parentId;
  for (let depth = 0; currentId && depth < 3; depth += 1) {
    const parent = await prisma.policy.findUnique({
      where: { id: currentId },
      select: {
        id: true,
        title: true,
        documentNumber: true,
        type: true,
        status: true,
        authorId: true,
        parentId: true,
      },
    });
    if (!parent) break;
    chain.unshift({
      id: parent.id,
      title: parent.title,
      documentNumber: parent.documentNumber,
      type: parent.type,
      status: parent.status,
      authorId: parent.authorId,
    });
    currentId = parent.parentId;
  }
  return chain;
}

function expiryFromForm(value: string) {
  if (!value) return null;
  return parseExpiryDate(value) ?? "invalid";
}

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}
