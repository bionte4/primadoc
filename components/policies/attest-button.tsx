"use client";

import { useActionState } from "react";
import { attestPolicy } from "@/actions/attestations";
import type { ActionState } from "@/actions/policies";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n-provider";
import { formatDateTime } from "@/lib/format";
import { fill } from "@/lib/i18n/labels";

export function AttestButton({
  policyId,
  readAt,
}: {
  policyId: string;
  readAt: Date | string | null;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionState) => attestPolicy(policyId),
    {},
  );
  const { locale, t } = useI18n();

  if (readAt || state.ok) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        {readAt ? fill(t.detail.alreadyReadAt, { date: formatDateTime(readAt, locale) }) : `${t.detail.alreadyRead}.`}
      </p>
    );
  }

  return (
    <form action={formAction}>
      {state.error && <p className="mb-1.5 text-xs text-destructive">{state.error}</p>}
      <Button type="submit" className="h-auto w-full whitespace-normal py-1.5 text-left" disabled={pending}>
        {pending ? t.common.saving : t.detail.confirmRead}
      </Button>
    </form>
  );
}
