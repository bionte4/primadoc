import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { auditLogWhere } from "@/lib/audit-query";
import { AUDIT_LABEL } from "@/lib/constants";
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

  const header = ["Waktu", "Pengguna", "Email", "Aksi", "Nomor dokumen", "Judul", "Detail"];
  const rows = logs.map((log) => [
    formatDateTime(log.timestamp),
    log.user.name,
    log.user.email,
    AUDIT_LABEL[log.action] ?? log.action,
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
