"use client";

import { useActionState } from "react";
import { inviteUser, type InviteState } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABEL } from "@/lib/constants";
import type { Role } from "@prisma/client";

const ROLES: Role[] = ["STAFF", "REVIEWER", "APPROVER", "ADMIN"];

export function InviteForm() {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(inviteUser, {});

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_9rem_auto] sm:items-end">
      <div className="space-y-1">
        <Label htmlFor="name">Nama</Label>
        <Input id="name" name="name" required className="h-8" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email kantor</Label>
        <Input id="email" name="email" type="email" required className="h-8" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="role">Peran</Label>
        <select
          id="role"
          name="role"
          defaultValue="STAFF"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABEL[role]}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Menyimpan..." : "Undang"}
      </Button>
      {state.error && <p className="text-xs text-destructive sm:col-span-4">{state.error}</p>}
      {state.ok && (
        <p className="text-xs text-muted-foreground sm:col-span-4">
          Email diundang. Pengguna masuk dengan akun kantor yang emailnya sama, atau dengan kata sandi jika akun lokal.
        </p>
      )}
    </form>
  );
}
