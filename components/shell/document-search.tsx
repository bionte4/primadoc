"use client";

import { Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";

export function DocumentSearch() {
  const router = useRouter();
  const { t } = useI18n();
  const [value, setValue] = useState("");

  function go(contentSearch: boolean) {
    const params = new URLSearchParams();
    const query = value.trim();
    if (query) params.set("q", query);
    const search = params.toString();
    router.push(
      contentSearch
        ? `/ai-search${query ? `?q=${encodeURIComponent(query)}` : ""}`
        : search
          ? `/policies?${search}`
          : "/policies",
    );
  }

  return (
    <form
      className="flex min-w-0 flex-1 items-center gap-1.5"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        go(false);
      }}
    >
      <div className="relative min-w-0 flex-1">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={t.search.placeholder}
          aria-label={t.search.label}
          className="h-8 pl-8 text-[13px]"
        />
      </div>
      <Button type="submit" size="icon-sm" variant="secondary" aria-label={t.search.submit}>
        <Search />
      </Button>
      <Button type="button" size="sm" variant="outline" onClick={() => go(true)}>
        <Sparkles />
        {t.search.ai}
      </Button>
    </form>
  );
}
