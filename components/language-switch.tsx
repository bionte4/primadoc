"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/actions/locale";
import { useI18n } from "@/components/i18n-provider";
import type { Locale } from "@/lib/i18n/labels";
import { cn } from "@/lib/utils";

export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={t.language.label}
      className={cn("inline-flex h-8 items-center rounded-lg bg-muted p-0.5 text-[11px] font-medium", className)}
    >
      <LocaleButton active={locale === "id"} disabled={pending} onClick={() => choose("id")}>
        ID
      </LocaleButton>
      <LocaleButton active={locale === "en"} disabled={pending} onClick={() => choose("en")}>
        EN
      </LocaleButton>
    </div>
  );
}

function LocaleButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "h-7 rounded-md px-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
