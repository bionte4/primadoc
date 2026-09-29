import { redirect } from "next/navigation";
import { UserActiveForm, UserIdentityForm, UserPasswordForm, UserRoleForm, BackupApproverForm } from "@/components/settings/user-admin-forms";
import { InviteForm } from "@/components/users/invite-form";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { canManageUsers } from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import { getDictionary } from "@/lib/i18n";

export default async function SettingsUsersPage() {
  const user = await requireUser();
  if (!canManageUsers(user.role)) redirect("/dashboard");
  const { t } = await getDictionary();

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      backupApproverId: true,
    },
  });
  const approvers = users.filter((account) => account.role === "APPROVER" && account.active);

  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t.users.title}</h1>
        <p className="text-xs text-muted-foreground">{t.users.lead}</p>
        <p className="text-xs text-muted-foreground">{t.users.identityHint}</p>
      </div>
      <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
        <h2 className="mb-2 text-sm font-medium">{t.users.add}</h2>
        <InviteForm />
      </div>
      <div className="overflow-x-auto rounded-lg bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>{t.users.name}</TableHead>
              <TableHead>{t.users.role}</TableHead>
              <TableHead>{t.users.status}</TableHead>
              <TableHead>{t.users.backup}</TableHead>
              <TableHead>{t.users.tempPassword}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((account) => {
              const self = account.id === user.id;
              return (
                <TableRow key={account.id}>
                  <TableCell className="px-2.5 py-1.5">
                    <UserIdentityForm
                      userId={account.id}
                      name={account.name}
                      email={account.email}
                    />
                  </TableCell>
                  <TableCell className="px-2.5 py-1.5">
                    <UserRoleForm key={account.role} userId={account.id} role={account.role} disabled={self} />
                    {self ? (
                      <p className="mt-1 text-[11px] text-muted-foreground">{t.users.selfRole}</p>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-2.5 py-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant={account.active ? "secondary" : "outline"}>
                        {account.active ? t.users.active : t.users.inactive}
                      </Badge>
                      <UserActiveForm userId={account.id} active={account.active} disabled={self} />
                    </div>
                  </TableCell>
                  <TableCell className="px-2.5 py-1.5">
                    {account.role === "APPROVER" ? (
                      <BackupApproverForm
                        key={account.backupApproverId ?? "none"}
                        userId={account.id}
                        name={account.name}
                        backupApproverId={account.backupApproverId}
                        approvers={approvers}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-2.5 py-1.5">
                    <UserPasswordForm userId={account.id} />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
