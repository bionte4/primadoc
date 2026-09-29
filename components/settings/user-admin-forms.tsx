"use client";

import { startTransition, useActionState } from "react";
import {
  setBackupApprover,
  setTemporaryPassword,
  setUserActive,
  updateUserProfile,
  updateUserRole,
  type UserAdminState,
} from "@/actions/users";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { fill } from "@/lib/i18n/labels";
import type { Role } from "@prisma/client";

const ROLES: Role[] = ["ADMIN", "APPROVER", "REVIEWER", "STAFF"];

const fieldClass =
  "h-7 w-full min-w-0 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function UserIdentityForm({
  userId,
  name,
  email,
}: {
  userId: string;
  name: string;
  email: string;
}) {
  const [state, action, pending] = useActionState<UserAdminState, FormData>(updateUserProfile, {});
  const { t } = useI18n();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => {
          action(data);
        });
      }}
      className="grid gap-1"
    >
      <input type="hidden" name="userId" value={userId} />
      <input name="name" defaultValue={name} required aria-label={t.users.name} className={fieldClass} />
      <input
        name="email"
        type="email"
        defaultValue={email}
        required
        aria-label={t.users.email}
        className={fieldClass}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="submit" size="xs" variant="outline" disabled={pending}>
          {pending ? t.common.saving : t.common.save}
        </Button>
        {state.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
        {state.ok && !state.error ? (
          <span className="text-[11px] text-muted-foreground">{t.users.saved}</span>
        ) : null}
      </div>
    </form>
  );
}

export function UserRoleForm({
  userId,
  role,
  disabled = false,
}: {
  userId: string;
  role: Role;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState<UserAdminState, FormData>(updateUserRole, {});
  const { t } = useI18n();

  return (
    <form action={action} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={role}
        disabled={disabled || pending}
        aria-label={t.users.roleLabel}
        className="h-7 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
      >
        {ROLES.map((item) => (
          <option key={item} value={item}>
            {t.role[item]}
          </option>
        ))}
      </select>
      <Button type="submit" size="xs" variant="outline" disabled={disabled || pending}>
        {pending ? t.common.saving : t.common.save}
      </Button>
      {state.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
    </form>
  );
}

export function UserActiveForm({
  userId,
  active,
  disabled = false,
}: {
  userId: string;
  active: boolean;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState<UserAdminState, FormData>(setUserActive, {});
  const { t } = useI18n();

  return (
    <form action={action} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <Button type="submit" size="xs" variant="ghost" disabled={disabled || pending}>
        {pending ? t.common.saving : active ? t.users.deactivate : t.users.activate}
      </Button>
      {state.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
    </form>
  );
}

export function UserPasswordForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState<UserAdminState, FormData>(setTemporaryPassword, {});
  const { t } = useI18n();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => {
          action(data);
        });
      }}
      className="flex flex-wrap items-center gap-1.5"
    >
      <input type="hidden" name="userId" value={userId} />
      <input
        name="password"
        type="password"
        autoComplete="new-password"
        required
        aria-label={t.users.tempPassword}
        className={`${fieldClass} max-w-36`}
      />
      <Button type="submit" size="xs" variant="outline" disabled={pending}>
        {pending ? t.common.saving : t.common.save}
      </Button>
      {state.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
      {state.ok ? <span className="text-[11px] text-muted-foreground">{t.users.tempPasswordSet}</span> : null}
    </form>
  );
}

export function BackupApproverForm({
  userId,
  name,
  backupApproverId,
  approvers,
}: {
  userId: string;
  name: string;
  backupApproverId: string | null;
  approvers: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<UserAdminState, FormData>(setBackupApprover, {});
  const { t } = useI18n();

  return (
    <form action={action} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="backupApproverId"
        defaultValue={backupApproverId ?? ""}
        disabled={pending}
        aria-label={fill(t.users.backupLabel, { name })}
        className="h-7 max-w-40 rounded-md border border-input bg-transparent px-1.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <option value="">{t.common.none}</option>
        {approvers
          .filter((approver) => approver.id !== userId)
          .map((approver) => (
            <option key={approver.id} value={approver.id}>
              {approver.name}
            </option>
          ))}
      </select>
      <Button type="submit" size="xs" variant="outline" disabled={pending}>
        {pending ? t.common.saving : t.common.save}
      </Button>
      {state.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
    </form>
  );
}
