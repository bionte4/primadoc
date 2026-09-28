"use server";

import { revalidatePath } from "next/cache";
import type { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { findInvitedUser } from "@/lib/invited-user";
import { canManageUsers } from "@/lib/rbac";
import { requireUser } from "@/lib/session";

const inviteSchema = z.object({
  name: z.string().trim().min(1, "Nama wajib diisi.").max(120),
  email: z.email("Masukkan email yang valid."),
  role: z.enum(["STAFF", "REVIEWER", "APPROVER", "ADMIN"]),
});

export type InviteState = { error?: string; ok?: boolean };

export async function inviteUser(_prev: InviteState, formData: FormData): Promise<InviteState> {
  const user = await requireUser();
  if (!canManageUsers(user.role)) {
    return { error: "Hanya admin yang dapat mengundang pengguna." };
  }

  const parsed = inviteSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await findInvitedUser(email);
  if (existing) {
    return { error: "Email ini sudah terdaftar." };
  }

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email,
      role: parsed.data.role as Role,
    },
  });

  revalidatePath("/users");
  return { ok: true };
}

export async function setBackupApprover(formData: FormData) {
  const user = await requireUser();
  if (!canManageUsers(user.role)) {
    return;
  }

  const userId = String(formData.get("userId") ?? "");
  const backupApproverId = String(formData.get("backupApproverId") ?? "");
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!target || target.role !== "APPROVER") return;

  if (!backupApproverId) {
    await prisma.user.update({
      where: { id: target.id },
      data: { backupApproverId: null },
    });
    revalidatePath("/users");
    return;
  }

  if (backupApproverId === target.id) return;
  const backup = await prisma.user.findUnique({
    where: { id: backupApproverId },
    select: { id: true, role: true },
  });
  if (!backup || backup.role !== "APPROVER") return;

  await prisma.user.update({
    where: { id: target.id },
    data: { backupApproverId: backup.id },
  });
  revalidatePath("/users");
}
