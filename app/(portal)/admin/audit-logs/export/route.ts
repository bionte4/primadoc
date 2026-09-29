import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { auditLogWhere } from "@/lib/audit-query";
import { auditLabel, getDictionary } from "@/lib/i18n";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { canManageUsers } from "@/lib/rbac";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.role || !canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const logs = await prisma.auditLog.findMany({
    where: auditLogWhere({
      from: url.searchParams.get("from") ?? "",
      to: url.searchParams.get("to") ?? "",
      user: url.searchParams.get("user") ?? "",
    }),
    include: {
      user: { select: { name: true, email: true } },
      policy: { select: { documentNumber: true, title: true } },
    },
    orderBy: { timestamp: "desc" },
  });

  const { locale, t } = await getDictionary();
  const header = [
    t.auditPage.time,
    t.auditPage.user,
    t.settings.email,
    t.auditPage.action,
    t.table.number,
    t.table.title,
    t.auditPage.detail,
  ];
  const rows = logs.map((log) => [
    formatDateTime(log.timestamp, locale),
    log.user.name,
    log.user.email,
    auditLabel(log.action, t),
    log.policy?.documentNumber ?? "",
    log.policy?.title ?? "",
    log.details ?? "",
  ]);
  const csv = `\uFEFF${[header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")}\n`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="audit-log.csv"',
    },
  });
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}
