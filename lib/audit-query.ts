import { Prisma } from "@prisma/client";

export type AuditFilters = {
  from?: string;
  to?: string;
  user?: string;
};

const DAY = /^\d{4}-\d{2}-\d{2}$/;

function jakartaBound(day: string, end: boolean) {
  if (!DAY.test(day)) return null;
  const stamp = end ? `${day}T23:59:59.999+07:00` : `${day}T00:00:00.000+07:00`;
  const date = new Date(stamp);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function auditLogWhere(filters: AuditFilters): Prisma.AuditLogWhereInput {
  const timestamp: Prisma.DateTimeFilter = {};
  const from = filters.from ? jakartaBound(filters.from, false) : null;
  const to = filters.to ? jakartaBound(filters.to, true) : null;
  if (from) timestamp.gte = from;
  if (to) timestamp.lte = to;

  const user = filters.user?.trim();
  return {
    ...(from || to ? { timestamp } : {}),
    ...(user
      ? { user: { name: { contains: user, mode: "insensitive" } } }
      : {}),
  };
}
