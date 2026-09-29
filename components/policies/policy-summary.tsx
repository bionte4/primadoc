"use client";

import { Sparkles } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { useActionState } from "react";
import { generatePolicySummary, type SummaryState } from "@/actions/policy-summary";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PolicySummary({ policyId }: { policyId: string }) {
  const [state, formAction, pending] = useActionState<SummaryState, FormData>(
    generatePolicySummary.bind(null, policyId),
    {},
  );
  const { t } = useI18n();

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-primary" />
          {t.summary.title}
        </CardTitle>
        <CardDescription>{t.summary.description}</CardDescription>
        <CardAction>
          <form action={formAction}>
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              <Sparkles />
              {pending ? t.summary.pending : t.summary.button}
            </Button>
          </form>
        </CardAction>
      </CardHeader>
      {(state.error || state.points) && (
        <CardContent>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          {state.points && (
            <ol className="space-y-2">
              {state.points.map((point, index) => (
                <li key={index} className="flex gap-2 text-sm leading-5">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                    {index + 1}
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      )}
    </Card>
  );
}
