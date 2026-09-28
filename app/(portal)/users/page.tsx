import { redirect } from "next/navigation";
import { InviteForm } from "@/components/users/invite-form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/constants";
import { canManageUsers } from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import { workplaceAccountLabel } from "@/lib/workplace-auth";

export default async function UsersPage() {
  const user = await requireUser();
  if (!canManageUsers(user.role)) redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      password: true,
      entraId: true,
      authProvider: true,
    },
  });

  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Pengguna</h1>
        <p className="text-xs text-muted-foreground">
          Undang email kantor, lalu pilih perannya di PrismaDoc. Direktori hanya membuktikan identitas.
        </p>
      </div>
      <div className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
        <InviteForm />
      </div>
      <div className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Nama</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead>Masuk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((account) => (
              <TableRow key={account.id}>
                <TableCell className="px-2.5 py-1.5">{account.name}</TableCell>
                <TableCell className="px-2.5 py-1.5">{account.email}</TableCell>
                <TableCell className="px-2.5 py-1.5">{ROLE_LABEL[account.role]}</TableCell>
                <TableCell className="px-2.5 py-1.5 text-muted-foreground">
                  {workplaceAccountLabel(account)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
