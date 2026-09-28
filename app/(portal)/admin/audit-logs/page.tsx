import { Download } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuditLogFilters } from "@/components/admin/audit-log-filters";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AUDIT_LABEL } from "@/lib/constants";
import { auditLogWhere } from "@/lib/audit-query";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { canManageUsers } from "@/lib/rbac";
import { requireUser } from "@/lib/session";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; user?: string }>;
}) {
  const user = await requireUser();
  if (!canManageUsers(user.role)) redirect("/dashboard");

  const params = await searchParams;
  const from = params.from ?? "";
  const to = params.to ?? "";
  const name = params.user ?? "";
  const exportQuery = new URLSearchParams();
  if (from) exportQuery.set("from", from);
  if (to) exportQuery.set("to", to);
  if (name.trim()) exportQuery.set("user", name.trim());
  const exportHref = exportQuery.size
    ? `/admin/audit-logs/export?${exportQuery}`
    : "/admin/audit-logs/export";

  const logs = await prisma.auditLog.findMany({
    where: auditLogWhere({ from, to, user: name }),
    include: {
      user: { select: { name: true, email: true } },
      policy: { select: { id: true, documentNumber: true, title: true } },
    },
    orderBy: { timestamp: "desc" },
    take: 500,
  });

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Audit log</h1>
          <p className="text-xs text-muted-foreground">
            Riwayat aktivitas pada kebijakan. Menampilkan {logs.length} entri terbaru yang cocok.
          </p>
        </div>
        <Button nativeButton={false} size="sm" variant="outline" render={<a href={exportHref} />}>
          <Download />
          Ekspor
        </Button>
      </div>

      <AuditLogFilters from={from} to={to} user={name} />

      <div className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
        <Table className="min-w-[760px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Waktu</TableHead>
              <TableHead>Pengguna</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Kebijakan</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-16 text-center text-sm text-muted-foreground">
                  Tidak ada log yang cocok dengan filter ini.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="px-2.5 py-1.5 text-xs whitespace-nowrap text-muted-foreground">
                    {formatDateTime(log.timestamp)}
                  </TableCell>
                  <TableCell className="px-2.5 py-1.5 whitespace-normal">
                    {log.user.name}
                    <span className="block text-[11px] text-muted-foreground">{log.user.email}</span>
                  </TableCell>
                  <TableCell className="px-2.5 py-1.5 whitespace-nowrap">
                    {AUDIT_LABEL[log.action] ?? log.action}
                  </TableCell>
                  <TableCell className="px-2.5 py-1.5 whitespace-normal">
                    {log.policy ? (
                      <Link href={`/policies/${log.policy.id}`} className="hover:underline">
                        {log.policy.documentNumber}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-md px-2.5 py-1.5 whitespace-normal">
                    {log.details ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
