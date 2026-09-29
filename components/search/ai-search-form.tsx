"use client";

import Link from "next/link";
import { useActionState } from "react";
import { askApprovedDocuments, type AiSearchState } from "@/actions/ai-search";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/i18n-provider";

export function AiSearchForm({ initialQuestion = "" }: { initialQuestion?: string }) {
  const [state, action, pending] = useActionState<AiSearchState, FormData>(askApprovedDocuments, {});
  const { t } = useI18n();

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t.ai.title}</h1>
        <p className="text-xs text-muted-foreground">
          {t.ai.lead}
        </p>
      </div>
      <form action={action} className="flex flex-col gap-2 rounded-lg bg-card p-3 ring-1 ring-foreground/10">
        <Label htmlFor="question">{t.ai.question}</Label>
        <Textarea
          id="question"
          name="question"
          required
          minLength={3}
          maxLength={500}
          defaultValue={initialQuestion}
          placeholder={t.ai.placeholder}
          className="min-h-24"
        />
        <Button type="submit" size="sm" className="self-start" disabled={pending}>
          {pending ? t.ai.asking : t.ai.ask}
        </Button>
      </form>
      {state.error ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {state.error}
        </p>
      ) : null}
      {state.answer ? (
        <section aria-labelledby="ai-answer" className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
          <h2 id="ai-answer" className="text-sm font-medium">
            {t.ai.answer}
          </h2>
          <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{state.answer}</p>
        </section>
      ) : null}
      {state.references && state.references.length > 0 ? (
        <section aria-labelledby="ai-sources">
          <h2 id="ai-sources" className="text-sm font-medium">
            {t.ai.references}
          </h2>
          <ul className="mt-2 flex flex-col gap-1.5">
            {state.references.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/policies/${item.id}`}
                  className="block rounded-lg bg-card px-3 py-2 ring-1 ring-foreground/10 outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="block text-[13px] font-medium">{item.title}</span>
                  <span className="block text-[11px] text-muted-foreground">{item.documentNumber}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
