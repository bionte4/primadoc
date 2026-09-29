"use client";

import { startTransition, useActionState } from "react";
import { inviteUser, type InviteState } from "@/actions/users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/components/i18n-provider";
import type { Role } from "@prisma/client";

const ROLES: Role[] = ["STAFF", "REVIEWER", "APPROVER", "ADMIN"];

export function InviteForm() {
  const [state, formAction, pending] = useActionState<InviteState, FormData>(inviteUser, {});
  const { t } = useI18n();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => {
          formAction(data);
        });
      }}
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_1fr_9rem_1fr_auto] xl:items-end"
    >
      <div className="space-y-1">
        <Label htmlFor="name">{t.users.name}</Label>
        <Input id="name" name="name" required className="h-8" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">{t.users.email}</Label>
        <Input id="email" name="email" type="email" required autoComplete="off" className="h-8" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="role">{t.users.role}</Label>
        <select
          id="role"
          name="role"
          defaultValue="STAFF"
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {t.role[role]}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">{t.users.password}</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="h-8"
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? t.common.saving : t.users.add}
      </Button>
      <p className="text-[11px] text-muted-foreground md:col-span-2 xl:col-span-5">{t.users.passwordHint}</p>
      {state.error && <p className="text-xs text-destructive md:col-span-2 xl:col-span-5">{state.error}</p>}
      {state.ok && (
        <p className="text-xs text-muted-foreground md:col-span-2 xl:col-span-5">
          {state.local ? t.users.invitedLocal : t.users.invited}
        </p>
      )}
    </form>
  );
}
