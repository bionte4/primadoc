"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { POLICY_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { DEPARTMENT_LABEL, DEPARTMENTS, TIER_LABEL } from "@/lib/document-kind";

const DOCUMENT_TYPES = ["POLICY", "PROCEDURE", "TECHNICAL_GUIDE"] as const;

export function PolicyFilters({
  query,
  status,
  documentType,
  department,
}: {
  query: string;
  status: string;
  documentType: string;
  department: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(query);

  function push(nextQuery: string, nextStatus: string, nextKind: string, nextDepartment: string) {
    const params = new URLSearchParams();
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    if (nextStatus) params.set("status", nextStatus);
    if (nextKind) params.set("type", nextKind);
    if (nextDepartment) params.set("department", nextDepartment);
    const search = params.toString();
    router.push(search ? `${pathname}?${search}` : pathname);
  }

  return (
    <form
      className="flex flex-col gap-1.5 sm:flex-row"
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
          placeholder="Cari judul atau isi dokumen"
          className="h-8 pl-8 text-[13px]"
          aria-label="Cari dokumen"
        />
      </div>
      <select
        value={status}
        aria-label="Filter status"
        className="h-8 rounded-lg border border-input bg-card px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-44"
        onChange={(event) => push(value, event.target.value, documentType, department)}
      >
        <option value="">Semua status</option>
        {POLICY_STATUSES.map((item) => (
          <option key={item} value={item}>
            {STATUS_LABEL[item]}
          </option>
        ))}
      </select>
      <select
        value={documentType}
        aria-label="Filter tier"
        className="h-8 rounded-lg border border-input bg-card px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-52"
        onChange={(event) => push(value, status, event.target.value, department)}
      >
        <option value="">Semua tier</option>
        {DOCUMENT_TYPES.map((item) => (
          <option key={item} value={item}>
            {TIER_LABEL[item]}
          </option>
        ))}
      </select>
      <select
        value={department}
        aria-label="Filter departemen"
        className="h-8 rounded-lg border border-input bg-card px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-40"
        onChange={(event) => push(value, status, documentType, event.target.value)}
      >
        <option value="">Semua departemen</option>
        {DEPARTMENTS.map((item) => (
          <option key={item} value={item}>
            {DEPARTMENT_LABEL[item]}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary" size="sm">
        Cari
      </Button>
    </form>
  );
}

export function TaxonomyFilters({
  department,
  documentType,
}: {
  department: string;
  documentType: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function push(nextDepartment: string, nextType: string) {
    const params = new URLSearchParams();
    if (nextDepartment) params.set("department", nextDepartment);
    if (nextType) params.set("type", nextType);
    const search = params.toString();
    router.push(search ? `${pathname}?${search}` : pathname);
  }

  return (
    <div className="flex flex-col gap-1.5 sm:flex-row">
      <select
        value={department}
        aria-label="Filter departemen"
        className="h-8 rounded-lg border border-input bg-card px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-44"
        onChange={(event) => push(event.target.value, documentType)}
      >
        <option value="">Semua departemen</option>
        {DEPARTMENTS.map((item) => (
          <option key={item} value={item}>
            {DEPARTMENT_LABEL[item]}
          </option>
        ))}
      </select>
      <select
        value={documentType}
        aria-label="Filter tier"
        className="h-8 rounded-lg border border-input bg-card px-2 text-[13px] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 sm:w-52"
        onChange={(event) => push(department, event.target.value)}
      >
        <option value="">Semua tier</option>
        {DOCUMENT_TYPES.map((item) => (
          <option key={item} value={item}>
            {TIER_LABEL[item]}
          </option>
        ))}
      </select>
    </div>
  );
}
