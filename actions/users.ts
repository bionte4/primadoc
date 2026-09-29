"use server";

import { Prisma, type Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { findInvitedUser } from "@/lib/invited-user";
import { getDictionary } from "@/lib/i18n";
import { fill } from "@/lib/i18n/labels";
import { BCRYPT_ROUNDS, passwordIssue, passwordIssueMessage } from "@/lib/password-policy";
import { canManageUsers } from "@/lib/rbac";
import { recordAudit } from "@/lib/record-audit";
import { requireUser } from "@/lib/session";

export type InviteState = { error?: string; ok?: boolean; local?: boolean };
export type UserAdminState = { error?: string; ok?: boolean };

const ROLES = ["STAFF", "REVIEWER", "APPROVER", "ADMIN"] as const;

function revalidateUsers() {
  revalidatePath("/users");
  revalidatePath("/settings/users");
}

export async function inviteUser(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const user = await requireUser();
  const { t } = await getDictionary();
  if (!canManageUsers(user.role)) {
    return { error: t.errors.adminInvite };
  }

  const parsed = z
    .object({
      name: z.string().trim().min(1, t.validation.nameRequired).max(120),
      email: z.email(t.validation.emailDot),
      role: z.enum(ROLES),
    })
    .safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      role: formData.get("role"),
    });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? t.errors.invalidData };
  }

  const email = parsed.data.email.toLowerCase();
  const password = String(formData.get("password") ?? "").trim();
  if (password) {
    const issue = passwordIssue(password, { email, name: parsed.data.name });
    if (issue) return { error: passwordIssueMessage(issue, t.validation) };
  }

  const existing = await findInvitedUser(email);
  if (existing) return { error: t.errors.emailTaken };

  const role = parsed.data.role as Role;
  try {
    const created = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        role,
        password: password ? await bcrypt.hash(password, BCRYPT_ROUNDS) : null,
        mustChangePassword: Boolean(password),
      },
    });
    await recordAudit(
      user.id,
      "INVITE_USER",
      fill(t.users.auditInvite, { name: created.name, email: created.email, role: t.role[role] }),
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: t.errors.emailTaken };
    }
    throw error;
  }

  revalidateUsers();
  return { ok: true, local: Boolean(password) };
}

export async function updateUserProfile(
  _prev: UserAdminState,
  formData: FormData,
): Promise<UserAdminState> {
  const actor = await requireUser();
  const { t } = await getDictionary();
  if (!canManageUsers(actor.role)) return { error: t.errors.adminInvite };

  const parsed = z
    .object({
      userId: z.string().min(1),
      name: z.string().trim().min(1, t.validation.nameRequired).max(120),
      email: z.email(t.validation.emailDot),
    })
    .safeParse({
      userId: formData.get("userId"),
      name: formData.get("name"),
      email: formData.get("email"),
    });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t.errors.invalidData };

  const email = parsed.data.email.toLowerCase();
  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, name: true, email: true },
  });
  if (!target) return { error: t.errors.userNotFound };
  if (target.name === parsed.data.name && target.email === email) return { ok: true };

  const taken = await findInvitedUser(email);
  if (taken && taken.id !== target.id) return { error: t.errors.emailTaken };

  const emailChanged = target.email !== email;
  try {
    await prisma.user.update({
      where: { id: target.id },
      data: {
        name: parsed.data.name,
        email,
        ...(emailChanged ? { entraId: null, authProvider: null, externalId: null } : {}),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: t.errors.emailTaken };
    }
    throw error;
  }

  await recordAudit(
    actor.id,
    "UPDATE_USER",
    fill(t.users.auditUpdate, {
      before: `${target.name} (${target.email})`,
      after: `${parsed.data.name} (${email})`,
    }),
  );
  revalidateUsers();
  return { ok: true };
}

export async function setTemporaryPassword(
  _prev: UserAdminState,
  formData: FormData,
): Promise<UserAdminState> {
  const actor = await requireUser();
  const { t } = await getDictionary();
  if (!canManageUsers(actor.role)) return { error: t.errors.adminPassword };

  const target = await prisma.user.findUnique({
    where: { id: String(formData.get("userId") ?? "") },
    select: { id: true, name: true, email: true },
  });
  if (!target) return { error: t.errors.userNotFound };

  const password = String(formData.get("password") ?? "");
  const issue = passwordIssue(password, target);
  if (issue) return { error: passwordIssueMessage(issue, t.validation) };

  await prisma.user.update({
    where: { id: target.id },
    data: {
      password: await bcrypt.hash(password, BCRYPT_ROUNDS),
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
  await recordAudit(actor.id, "SET_PASSWORD", fill(t.users.auditPassword, { name: target.name }));
  revalidateUsers();
  return { ok: true };
}

export async function setBackupApprover(
  _prev: UserAdminState,
  formData: FormData,
): Promise<UserAdminState> {
  const user = await requireUser();
  const { t } = await getDictionary();
  if (!canManageUsers(user.role)) return { error: t.errors.adminRole };

  const userId = String(formData.get("userId") ?? "");
  const backupApproverId = String(formData.get("backupApproverId") ?? "");
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, backupApproverId: true },
  });
  if (!target || target.role !== "APPROVER") return { error: t.errors.backupRole };

  if (!backupApproverId) {
    if (target.backupApproverId) {
      await prisma.user.update({ where: { id: target.id }, data: { backupApproverId: null } });
      await recordAudit(user.id, "SET_BACKUP", fill(t.users.auditBackupClear, { name: target.name }));
    }
    revalidateUsers();
    return { ok: true };
  }

  if (backupApproverId === target.id) return { error: t.errors.backupSelf };
  const backup = await prisma.user.findUnique({
    where: { id: backupApproverId },
    select: { id: true, name: true, role: true, active: true },
  });
  if (!backup || backup.role !== "APPROVER" || !backup.active) return { error: t.errors.backupInactive };
  if (target.backupApproverId === backup.id) return { ok: true };

  await prisma.user.update({
    where: { id: target.id },
    data: { backupApproverId: backup.id },
  });
  await recordAudit(
    user.id,
    "SET_BACKUP",
    fill(t.users.auditBackup, { name: target.name, backup: backup.name }),
  );
  revalidateUsers();
  return { ok: true };
}

export async function updateUserRole(
  _prev: UserAdminState,
  formData: FormData,
): Promise<UserAdminState> {
  const actor = await requireUser();
  const { t } = await getDictionary();
  if (!canManageUsers(actor.role)) return { error: t.errors.adminRole };

  const parsed = z
    .object({
      userId: z.string().min(1),
      role: z.enum(ROLES),
    })
    .safeParse({
      userId: formData.get("userId"),
      role: formData.get("role"),
    });
  if (!parsed.success) return { error: t.errors.invalidRole };
  if (parsed.data.userId === actor.id) return { error: t.errors.ownRole };

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, name: true, role: true },
  });
  if (!target) return { error: t.errors.userNotFound };
  if (target.role === parsed.data.role) return {};

  if (target.role === "ADMIN" && parsed.data.role !== "ADMIN") {
    const admins = await prisma.user.count({
      where: { role: "ADMIN", active: true, id: { not: target.id } },
    });
    if (admins < 1) return { error: t.errors.lastAdmin };
  }

  const nextRole = parsed.data.role;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: target.id },
      data: {
        role: nextRole,
        ...(nextRole === "APPROVER" ? {} : { backupApproverId: null }),
      },
    });
    if (nextRole !== "APPROVER") {
      await tx.user.updateMany({
        where: { backupApproverId: target.id },
        data: { backupApproverId: null },
      });
    }
    await tx.auditLog.create({
      data: {
        userId: actor.id,
        action: "SET_ROLE",
        details: fill(t.users.auditRole, {
          name: target.name,
          from: t.role[target.role],
          to: t.role[nextRole],
        }),
      },
    });
  });

  revalidateUsers();
  return {};
}

export async function setUserActive(
  _prev: UserAdminState,
  formData: FormData,
): Promise<UserAdminState> {
  const actor = await requireUser();
  const { t } = await getDictionary();
  if (!canManageUsers(actor.role)) return { error: t.errors.adminStatus };

  const userId = String(formData.get("userId") ?? "");
  const active = formData.get("active") === "true";
  if (!userId) return { error: t.errors.userNotFound };
  if (userId === actor.id) return { error: t.errors.ownActive };

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role: true, active: true },
  });
  if (!target) return { error: t.errors.userNotFound };
  if (target.active === active) return {};

  if (!active && target.role === "ADMIN") {
    const admins = await prisma.user.count({
      where: { role: "ADMIN", active: true, id: { not: target.id } },
    });
    if (admins < 1) return { error: t.errors.lastAdmin };
  }

  const details = fill(t.users.auditActive, {
    name: target.name,
    status: active ? t.users.active : t.users.inactive,
  });

  if (!active) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: target.id },
        data: { active: false, backupApproverId: null },
      }),
      prisma.user.updateMany({
        where: { backupApproverId: target.id },
        data: { backupApproverId: null },
      }),
      prisma.auditLog.create({
        data: { userId: actor.id, action: "SET_ACTIVE", details },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.user.update({ where: { id: target.id }, data: { active: true } }),
      prisma.auditLog.create({
        data: { userId: actor.id, action: "SET_ACTIVE", details },
      }),
    ]);
  }

  revalidateUsers();
  return {};
}
