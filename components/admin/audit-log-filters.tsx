"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";

export function AuditLogFilters({
  from,
  to,
  user,
}: {
  from: string;
  to: string;
  user: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(user);
  const [start, setStart] = useState(from);
  const [end, setEnd] = useState(to);
  const { t } = useI18n();

  function push(next: { from: string; to: string; user: string }) {
    const params = new URLSearchParams();
    if (next.from) params.set("from", next.from);
    if (next.to) params.set("to", next.to);
    if (next.user.trim()) params.set("user", next.user.trim());
    const search = params.toString();
    router.push(search ? `/admin/audit-logs?${search}` : "/admin/audit-logs");
  }

  return (
    <form
      className="flex flex-col gap-1.5 sm:flex-row sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        push({ from: start, to: end, user: name });
      }}
    >
      <label className="space-y-1 text-xs text-muted-foreground">
        {t.auditPage.from}
        <Input
          type="date"
          value={start}
          onChange={(event) => setStart(event.target.value)}
          className="h-8 text-[13px] text-foreground"
        />
      </label>
      <label className="space-y-1 text-xs text-muted-foreground">
        {t.auditPage.to}
        <Input
          type="date"
          value={end}
          onChange={(event) => setEnd(event.target.value)}
          className="h-8 text-[13px] text-foreground"
        />
      </label>
      <label className="min-w-0 flex-1 space-y-1 text-xs text-muted-foreground">
        {t.auditPage.userName}
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t.auditPage.userPlaceholder}
          className="h-8 text-[13px]"
          aria-label={t.auditPage.userName}
        />
      </label>
      <Button type="submit" size="sm" variant="secondary">
        {t.auditPage.show}
      </Button>
    </form>
  );
}
