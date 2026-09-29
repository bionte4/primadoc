import { prisma } from "@/lib/db";

export function recordAudit(userId: string, action: string, details: string) {
  return prisma.auditLog.create({
    data: { userId, action, details },
  });
}
