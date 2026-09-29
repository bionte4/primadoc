"use client";

import { startTransition, useActionState } from "react";
import { updateDepartmentName, type DepartmentNameState } from "@/actions/organization";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";
import { fill } from "@/lib/i18n/labels";
import type { Department } from "@prisma/client";

export function DepartmentNameForm({ code, name }: { code: Department; name: string }) {
  const [state, action, pending] = useActionState<DepartmentNameState, FormData>(updateDepartmentName, {});
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
      <input type="hidden" name="code" value={code} />
      <Input
        name="name"
        defaultValue={name}
        required
        maxLength={40}
        aria-label={fill(t.organization.nameLabel, { code })}
        className="h-8 w-40"
      />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        {pending ? t.common.saving : t.common.save}
      </Button>
      {state.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
      {state.ok ? <span className="text-xs text-muted-foreground">{t.common.saved}</span> : null}
    </form>
  );
}
