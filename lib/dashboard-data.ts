import { stat } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/rbac";
import { isSafeStoredName, uploadsDirectory } from "@/lib/upload";

/** Local uploads budget for the MVP store. Not the size of the host disk. */
export const APP_STORAGE_QUOTA_BYTES = 1024 * 1024 * 1024;

export async function storageSnapshot() {
  const rows = await prisma.policy.findMany({
    where: { fileUrl: { not: null } },
    select: { fileUrl: true },
    distinct: ["fileUrl"],
  });

  let usedBytes = 0;
  let files = 0;
  for (const row of rows) {
    if (!row.fileUrl || !isSafeStoredName(row.fileUrl)) continue;
    try {
      const info = await stat(path.join(uploadsDirectory(), row.fileUrl));
      usedBytes += info.size;
      files += 1;
    } catch {
      // The row points at a file that is no longer on disk.
    }
  }

  return { usedBytes, files, quotaBytes: APP_STORAGE_QUOTA_BYTES };
}

export async function recentActivity(user: SessionUser) {
  return prisma.auditLog.findMany({
    where:
      user.role === "STAFF"
        ? {
            OR: [
              { userId: user.id },
              {
                policy: {
                  isCurrent: true,
                  OR: [{ authorId: user.id }, { status: "APPROVED" }],
                },
              },
            ],
          }
        : {},
    include: {
      user: { select: { name: true } },
      policy: {
        select: { id: true, title: true, documentNumber: true, status: true, authorId: true },
      },
    },
    orderBy: { timestamp: "desc" },
    take: 6,
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"] as const;
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(value)} ${units[unit]}`;
}
