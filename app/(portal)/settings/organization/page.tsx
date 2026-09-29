import { redirect } from "next/navigation";
import { DepartmentNameForm } from "@/components/settings/department-name-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDepartmentLabels } from "@/lib/department-labels";
import { DEPARTMENTS } from "@/lib/document-kind";
import { prisma } from "@/lib/db";
import { canManageUsers } from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import { getDictionary } from "@/lib/i18n";

export default async function SettingsOrganizationPage() {
  const user = await requireUser();
  if (!canManageUsers(user.role)) redirect("/dashboard");
  const { t } = await getDictionary();

  const [labels, grouped] = await Promise.all([
    getDepartmentLabels(),
    prisma.policy.groupBy({
      by: ["department"],
      where: { isCurrent: true },
      _count: { _all: true },
    }),
  ]);
  const counts = Object.fromEntries(grouped.map((row) => [row.department, row._count._all])) as Partial<
    Record<(typeof DEPARTMENTS)[number], number>
  >;

  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t.organization.title}</h1>
        <p className="text-xs text-muted-foreground">{t.organization.lead}</p>
      </div>
      <div className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t.organization.code}</TableHead>
              <TableHead>{t.organization.name}</TableHead>
              <TableHead>{t.organization.current}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEPARTMENTS.map((code) => (
              <TableRow key={code}>
                <TableCell className="px-2.5 py-1.5 font-medium">{code}</TableCell>
                <TableCell className="px-2.5 py-1.5">
                  <DepartmentNameForm key={labels[code]} code={code} name={labels[code]} />
                </TableCell>
                <TableCell className="px-2.5 py-1.5 tabular-nums">{counts[code] ?? 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
