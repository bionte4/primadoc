import { prisma } from "@/lib/db";

export async function findInvitedUser(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  return prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
  });
}
