"use client";

import { useActionState } from "react";
import { attestPolicy } from "@/actions/attestations";
import type { ActionState } from "@/actions/policies";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";

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

  if (readAt || state.ok) {
    return (
      <p className="text-xs leading-5 text-muted-foreground">
        Anda sudah membaca kebijakan ini
        {readAt ? ` pada ${formatDateTime(readAt)}` : ""}.
      </p>
    );
  }

  return (
    <form action={formAction}>
      {state.error && <p className="mb-1.5 text-xs text-destructive">{state.error}</p>}
      <Button type="submit" className="h-auto w-full whitespace-normal py-1.5 text-left" disabled={pending}>
        {pending ? "Menyimpan..." : "Saya Telah Membaca Kebijakan Ini"}
      </Button>
    </form>
  );
}
