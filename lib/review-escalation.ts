import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { reviewDeadline, reviewSlaDays } from "@/lib/review-sla";

export async function findPrimaryApproverId() {
  const approver = await prisma.user.findFirst({
    where: { role: "APPROVER", active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return approver?.id ?? null;
}

export async function escalateStaleReviews(now = new Date()) {
  const slaDays = reviewSlaDays();
  const policies = await prisma.policy.findMany({
    where: { isCurrent: true, status: "IN_REVIEW", escalatedAt: null },
    include: {
      approvals: {
        where: { status: "PENDING" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
      primaryApprover: {
        select: {
          id: true,
          name: true,
          role: true,
          active: true,
          backupApprover: { select: { id: true, name: true, role: true, active: true } },
        },
      },
    },
  });

  const fallbackPrimary = await prisma.user.findFirst({
    where: { role: "APPROVER", active: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      role: true,
      active: true,
      backupApprover: { select: { id: true, name: true, role: true, active: true } },
    },
  });

  let reminded = 0;
  let delegated = 0;

  for (const policy of policies) {
    const startedAt = policy.reviewStartedAt ?? policy.approvals[0]?.createdAt ?? policy.updatedAt;
    if (!reviewDeadline(startedAt, now)) continue;

    const assigned = policy.primaryApprover;
    const primary = assigned?.active ? assigned : fallbackPrimary;
    if (!primary) continue;

    const backup = primary.backupApprover;
    const canDelegate =
      backup && backup.active && backup.role === "APPROVER" && backup.id !== primary.id;

    if (canDelegate && backup) {
      await delegateReview({
        policyId: policy.id,
        documentNumber: policy.documentNumber,
        title: policy.title,
        startedAt,
        primary,
        backup,
        slaDays,
      });
      delegated += 1;
      continue;
    }

    if (policy.remindedAt) continue;

    await remindReview({
      policyId: policy.id,
      documentNumber: policy.documentNumber,
      title: policy.title,
      startedAt,
      primary,
      slaDays,
    });
    reminded += 1;
  }

  return { reminded, delegated };
}

async function delegateReview(input: {
  policyId: string;
  documentNumber: string;
  title: string;
  startedAt: Date;
  primary: { id: string; name: string };
  backup: { id: string; name: string; role: Role };
  slaDays: number;
}) {
  const detail = `${input.documentNumber} melewati ${input.slaDays} hari tanpa keputusan. Tugas berpindah dari ${input.primary.name} ke ${input.backup.name}.`;

  await prisma.$transaction([
    prisma.policy.update({
      where: { id: input.policyId },
      data: {
        reviewStartedAt: input.startedAt,
        primaryApproverId: input.primary.id,
        delegatedApproverId: input.backup.id,
        escalatedAt: new Date(),
      },
    }),
    prisma.notification.create({
      data: {
        userId: input.primary.id,
        policyId: input.policyId,
        title: "Persetujuan dilimpahkan",
        body: `${input.title} (${input.documentNumber}) melewati batas ${input.slaDays} hari. Tugas berpindah ke ${input.backup.name}.`,
      },
    }),
    prisma.notification.create({
      data: {
        userId: input.backup.id,
        policyId: input.policyId,
        title: "Tugas persetujuan dilimpahkan",
        body: `${input.title} (${input.documentNumber}) menunggu keputusan Anda karena approver utama tidak bertindak dalam ${input.slaDays} hari.`,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: input.primary.id,
        policyId: input.policyId,
        action: "ESCALATE",
        details: detail,
      },
    }),
  ]);
}

async function remindReview(input: {
  policyId: string;
  documentNumber: string;
  title: string;
  startedAt: Date;
  primary: { id: string; name: string };
  slaDays: number;
}) {
  await prisma.$transaction([
    prisma.policy.update({
      where: { id: input.policyId },
      data: {
        reviewStartedAt: input.startedAt,
        primaryApproverId: input.primary.id,
        remindedAt: new Date(),
      },
    }),
    prisma.notification.create({
      data: {
        userId: input.primary.id,
        policyId: input.policyId,
        title: "Pengingat persetujuan",
        body: `${input.title} (${input.documentNumber}) sudah ${input.slaDays} hari dalam review dan belum diputuskan. Atur approver cadangan bila tugas perlu dilimpahkan.`,
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: input.primary.id,
        policyId: input.policyId,
        action: "REMIND",
        details: `Pengingat: ${input.documentNumber} melewati ${input.slaDays} hari tanpa keputusan dari ${input.primary.name}.`,
      },
    }),
  ]);
}
