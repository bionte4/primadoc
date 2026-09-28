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
import { findPrimaryApproverId } from "@/lib/review-escalation";
import { searchPolicies, snippetParts } from "@/lib/policy-search";
import { POLICY_STATUSES } from "@/lib/constants";
import {
  notesSchema,
  policyFormSchema,
  requiredNotesSchema,
} from "@/lib/validators/policy";
import type { PolicyStatus } from "@prisma/client";

export type ActionState = {
  error?: string;
  ok?: boolean;
};

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

export async function listPolicies(user: SessionUser, query: string, status: string) {
  const visibility: Prisma.PolicyWhereInput =
    user.role === "STAFF"
      ? { OR: [{ authorId: user.id }, { status: "APPROVED" }] }
      : {};

  const statusFilter: Prisma.PolicyWhereInput = isPolicyStatus(status)
    ? { status }
    : {};

  const hits = query ? await searchPolicies(query) : null;
  if (hits && hits.length === 0) return [];
  const rank = new Map(hits?.map((hit, index) => [hit.id, index]));

  const policies = await prisma.policy.findMany({
    where: {
      AND: [
        { isCurrent: true },
        visibility,
        statusFilter,
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

export async function countPolicies(user: SessionUser) {
  const visibility: Prisma.PolicyWhereInput =
    user.role === "STAFF"
      ? { OR: [{ authorId: user.id }, { status: "APPROVED" }] }
      : {};

  const grouped = await prisma.policy.groupBy({
    by: ["status"],
    where: { AND: [{ isCurrent: true }, visibility] },
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
    return { error: "Anda tidak memiliki akses untuk membuat kebijakan." };
  }

  const parsed = policyFormSchema.safeParse({
    title: formData.get("title"),
    documentNumber: formData.get("documentNumber"),
    category: formData.get("category"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Lampirkan berkas kebijakan." };
  }

  let stored: StoredFile;
  try {
    stored = await savePolicyFile(file);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Gagal mengunggah berkas." };
  }

  try {
    const policy = await prisma.$transaction(async (tx) => {
      const documentNumber = parsed.data.documentNumber.toUpperCase();
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
          category: parsed.data.category,
          description: parsed.data.description,
          fileUrl: stored.storedName,
          fileName: stored.originalName,
          contentText: stored.contentText || null,
          version: "1.0",
          versionGroupId: "pending",
          status: "DRAFT",
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
    if (isTakenNumber(error) || isUniqueViolation(error)) {
      return { error: "Nomor dokumen sudah digunakan." };
    }
    return { error: "Gagal menyimpan kebijakan." };
  }
}

export async function updatePolicy(
  policyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();
  const existing = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!existing) return { error: "Kebijakan tidak ditemukan." };

  if (!existing.isCurrent) {
    return { error: "Hanya versi terbaru yang dapat diubah." };
  }
  if (!canEditPolicy(user.role, existing.status, existing.authorId === user.id)) {
    return { error: "Kebijakan ini tidak dapat diubah pada status saat ini." };
  }

  const parsed = policyFormSchema.safeParse({
    title: formData.get("title"),
    documentNumber: formData.get("documentNumber"),
    category: formData.get("category"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const file = formData.get("file");
  let stored: StoredFile | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      stored = await savePolicyFile(file);
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Gagal mengunggah berkas.",
      };
    }
  }

  const bump = formData.get("versionBump") === "major" ? "major" : "minor";
  const version =
    bump === "major" ? nextMajorVersion(existing.version) : nextMinorVersion(existing.version);
  const documentNumber = parsed.data.documentNumber.toUpperCase();

  try {
    const created = await prisma.$transaction(async (tx) => {
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
          category: parsed.data.category,
          description: parsed.data.description,
          fileUrl: stored?.storedName ?? existing.fileUrl,
          fileName: stored?.originalName ?? existing.fileName,
          contentText: stored ? stored.contentText || null : existing.contentText,
          version,
          versionGroupId: existing.versionGroupId,
          isCurrent: true,
          status: "DRAFT",
          authorId: existing.authorId,
        },
      });

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
    if (isTakenNumber(error) || isUniqueViolation(error)) {
      return { error: "Nomor dokumen sudah digunakan." };
    }
    return { error: "Gagal memperbarui kebijakan." };
  }
}

export async function submitForReview(
  policyId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const notes = String(formData.get("notes") ?? "");
  const parsed = notesSchema.safeParse({ notes });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Catatan tidak valid." };
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
  const parsed = notesSchema.safeParse({ notes });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Catatan tidak valid." };
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
  const parsed = requiredNotesSchema.safeParse({ notes });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Alasan penolakan wajib diisi." };
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
  const parsed = notesSchema.safeParse({ notes });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Catatan tidak valid." };
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
  if (!policy) return { error: "Kebijakan tidak ditemukan." };
  if (!policy.isCurrent) {
    return { error: "Revisi hanya dapat dibuat dari versi terbaru." };
  }
  if (!canRevise(user.role, policy.status, policy.authorId === user.id)) {
    return { error: "Revisi hanya dapat dibuat dari kebijakan yang sudah disetujui." };
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
        isCurrent: true,
        status: "DRAFT",
        authorId: policy.authorId,
      },
    });
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
  if (!policy) return { error: "Kebijakan tidak ditemukan." };
  if (!policy.isCurrent) {
    return { error: "Hanya versi terbaru yang dapat dihapus." };
  }
  if (!canDeletePolicy(user.role, policy.status, policy.authorId === user.id)) {
    return { error: "Hanya draf atau dokumen yang ditolak yang dapat dihapus." };
  }

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
    await tx.policy.delete({ where: { id: policy.id } });
    if (previous) {
      await tx.policy.update({
        where: { id: previous.id },
        data: { isCurrent: true },
      });
    }
  });

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
  const parsed = requiredNotesSchema.safeParse({
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Catatan wajib diisi." };
  }

  const policy = await prisma.policy.findUnique({ where: { id: policyId } });
  if (!policy) return { error: "Kebijakan tidak ditemukan." };
  if (!canAddReviewNote(user.role, policy.status)) {
    return { error: "Catatan review hanya dapat ditambahkan saat dokumen dalam review." };
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
  if (!policy) return { error: "Kebijakan tidak ditemukan." };
  if (!policy.isCurrent) {
    return { error: "Aksi ini hanya berlaku untuk versi terbaru." };
  }
  if (!input.from.includes(policy.status)) {
    return { error: "Status kebijakan tidak memungkinkan aksi ini." };
  }
  if (!input.authorize(user, policy)) {
    return { error: "Anda tidak memiliki akses untuk aksi ini." };
  }

  const enteringReview = input.to === "IN_REVIEW";
  const primaryApproverId = enteringReview ? await findPrimaryApproverId() : null;

  await prisma.$transaction(async (tx) => {
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
        details: [input.detail(policy.documentNumber), input.notes]
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

function isRedirectError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}
