"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n-provider";
import { POLICY_STATUSES } from "@/lib/constants";
import type { DepartmentLabels } from "@/lib/department-labels";
import { DEPARTMENTS } from "@/lib/document-kind";

const DOCUMENT_TYPES = ["POLICY", "PROCEDURE", "TECHNICAL_GUIDE"] as const;

export function PolicyFilters({
  query,
  status,
  documentType,
  department,
  scope = "",
  contentSearch = false,
  labels,
}: {
  query: string;
  status: string;
  documentType: string;
  department: string;
  scope?: string;
  contentSearch?: boolean;
  labels?: DepartmentLabels;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const names = labels ?? t.department;
  const [value, setValue] = useState(query);

  function push(nextQuery: string, nextStatus: string, nextKind: string, nextDepartment: string) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextStatus) params.set("status", nextStatus);
    if (nextKind) params.set("type", nextKind);
    if (nextDepartment) params.set("department", nextDepartment);
    if (scope === "mine") params.set("scope", "mine");
    if (contentSearch) params.set("ai", "1");
    const search = params.toString();
    router.push(search ? `${pathname}?${search}` : pathname);
  }

  return (
      <form
      className="flex w-full min-w-0 flex-col gap-1.5 sm:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        push(value, status, documentType, department);
      }}
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={contentSearch ? t.search.contentPlaceholder : t.search.placeholder}
          className="h-8 pl-8 text-[13px]"
          aria-label={t.search.documents}
        />
      </div>
      <select
        value={status}
        aria-label={t.filters.status}
        className="h-8 w-full min-w-0 max-w-[calc(100vw-2.5rem)] rounded-lg border border-input bg-card px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-44"
        onChange={(event) => push(value, event.target.value, documentType, department)}
      >
        <option value="">{t.filters.allStatus}</option>
        {POLICY_STATUSES.map((item) => (
          <option key={item} value={item}>
            {t.status[item]}
          </option>
        ))}
      </select>
      <select
        value={documentType}
        aria-label={t.filters.tier}
        className="h-8 w-full min-w-0 max-w-[calc(100vw-2.5rem)] rounded-lg border border-input bg-card px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-52"
        onChange={(event) => push(value, status, event.target.value, department)}
      >
        <option value="">{t.filters.allTier}</option>
        {DOCUMENT_TYPES.map((item) => (
          <option key={item} value={item}>
            {t.tier[item]}
          </option>
        ))}
      </select>
      <select
        value={department}
        aria-label={t.filters.department}
        className="h-8 w-full min-w-0 max-w-[calc(100vw-2.5rem)] rounded-lg border border-input bg-card px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-40"
        onChange={(event) => push(value, status, documentType, event.target.value)}
      >
        <option value="">{t.filters.allDepartment}</option>
        {DEPARTMENTS.map((item) => (
          <option key={item} value={item}>
            {names[item]}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary" size="sm">
        {t.common.search}
      </Button>
    </form>
  );
}

export function TaxonomyFilters({
  department,
  documentType,
  labels,
}: {
  department: string;
  documentType: string;
  labels?: DepartmentLabels;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const names = labels ?? t.department;

  function push(nextDepartment: string, nextType: string) {
    const params = new URLSearchParams();
    if (nextDepartment) params.set("department", nextDepartment);
    if (nextType) params.set("type", nextType);
    const search = params.toString();
    router.push(search ? `${pathname}?${search}` : pathname);
  }

  return (
    <div className="grid w-full min-w-0 grid-cols-1 gap-1.5 sm:grid-cols-2">
      <select
        value={department}
        aria-label={t.filters.department}
        className="h-8 w-full min-w-0 max-w-[calc(100vw-2.5rem)] rounded-lg border border-input bg-card px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        onChange={(event) => push(event.target.value, documentType)}
      >
        <option value="">{t.filters.allDepartment}</option>
        {DEPARTMENTS.map((item) => (
          <option key={item} value={item}>
            {names[item]}
          </option>
        ))}
      </select>
      <select
        value={documentType}
        aria-label={t.filters.tier}
        className="h-8 w-full min-w-0 max-w-[calc(100vw-2.5rem)] rounded-lg border border-input bg-card px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        onChange={(event) => push(department, event.target.value)}
      >
        <option value="">{t.filters.allTier}</option>
        {DOCUMENT_TYPES.map((item) => (
          <option key={item} value={item}>
            {t.tier[item]}
          </option>
        ))}
      </select>
    </div>
  );
}
