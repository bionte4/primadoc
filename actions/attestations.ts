"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { canAttest, canViewPolicy } from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import type { ActionState } from "@/actions/policies";

export async function attestPolicy(policyId: string): Promise<ActionState> {
  const user = await requireUser();
  if (!canAttest(user.role)) {
    return { error: "Konfirmasi baca hanya untuk staf." };
  }

  const policy = await prisma.policy.findUnique({
    where: { id: policyId },
    select: { id: true, status: true, authorId: true, documentNumber: true },
  });
  if (!policy || !canViewPolicy(user.role, policy.status, policy.authorId === user.id)) {
    return { error: "Kebijakan tidak ditemukan." };
  }

  await prisma.attestation.upsert({
    where: { userId_policyId: { userId: user.id, policyId } },
    update: {},
    create: { userId: user.id, policyId },
  });

  revalidatePath(`/policies/${policyId}`);
  return { ok: true };
}

export async function getMyAttestation(userId: string, policyId: string) {
  return prisma.attestation.findUnique({
    where: { userId_policyId: { userId, policyId } },
    select: { readAt: true },
  });
}

export async function getAttestationReport(policyId: string) {
  const [staff, reads] = await Promise.all([
    prisma.user.findMany({
      where: { role: "STAFF" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.attestation.findMany({
      where: { policyId, user: { role: "STAFF" } },
      select: { userId: true, readAt: true },
    }),
  ]);

  const readAtByUser = new Map(reads.map((row) => [row.userId, row.readAt]));
  const unread = staff.filter((person) => !readAtByUser.has(person.id));
  const read = staff
    .filter((person) => readAtByUser.has(person.id))
    .map((person) => ({ ...person, readAt: readAtByUser.get(person.id)! }));

  return { unread, read, total: staff.length };
}
