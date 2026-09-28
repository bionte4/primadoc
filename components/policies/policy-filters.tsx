"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { POLICY_STATUSES, STATUS_LABEL } from "@/lib/constants";

export function PolicyFilters({
  query,
  status,
}: {
  query: string;
  status: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(query);

  function push(nextQuery: string, nextStatus: string) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextStatus) params.set("status", nextStatus);
    const search = params.toString();
    router.push(search ? `${pathname}?${search}` : pathname);
  }

  return (
    <form
      className="flex flex-col gap-1.5 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        push(value, status);
      }}
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Cari judul, nomor, atau kategori"
          className="h-8 pl-8 text-[13px]"
          aria-label="Cari kebijakan"
        />
      </div>
      <select
        value={status}
        aria-label="Filter status"
        className="h-8 rounded-lg border border-input bg-card px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-44"
        onChange={(event) => push(value, event.target.value)}
      >
        <option value="">Semua status</option>
        {POLICY_STATUSES.map((item) => (
          <option key={item} value={item}>
            {STATUS_LABEL[item]}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary" size="sm">
        Cari
      </Button>
    </form>
  );
}
