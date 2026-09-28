import { redirect } from "next/navigation";
import { setBackupApprover } from "@/actions/users";
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
      backupApproverId: true,
    },
  });
  const approvers = users.filter((account) => account.role === "APPROVER");

  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Pengguna</h1>
        <p className="text-xs text-muted-foreground">
          Undang email kantor, lalu pilih perannya di PrismaDoc. Untuk approver, pilih cadangan yang menerima tugas setelah batas waktu review.
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
                <TableHead>Cadangan</TableHead>
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
                <TableCell className="px-2.5 py-1.5">
                  {account.role === "APPROVER" ? (
                    <form action={setBackupApprover} className="flex items-center gap-1.5">
                      <input type="hidden" name="userId" value={account.id} />
                      <select
                        name="backupApproverId"
                        defaultValue={account.backupApproverId ?? ""}
                        aria-label={`Approver cadangan untuk ${account.name}`}
                        className="h-7 max-w-40 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        <option value="">Tidak ada</option>
                        {approvers
                          .filter((approver) => approver.id !== account.id)
                          .map((approver) => (
                            <option key={approver.id} value={approver.id}>
                              {approver.name}
                            </option>
                          ))}
                      </select>
                      <button type="submit" className="text-xs font-medium text-primary hover:underline">
                        Simpan
                      </button>
                    </form>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
