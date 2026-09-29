"use client";

import type { PolicyStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/i18n-provider";
import { cn } from "@/lib/utils";

const STATUS_CLASS: Record<PolicyStatus, string> = {
  DRAFT: "border-slate-200 bg-slate-100 text-slate-700",
  IN_REVIEW: "border-amber-200 bg-amber-50 text-amber-900",
  APPROVED: "border-emerald-200 bg-emerald-50 text-emerald-800",
  REJECTED: "border-rose-200 bg-rose-50 text-rose-800",
  ARCHIVED: "border-zinc-200 bg-zinc-100 text-zinc-600",
};

export function StatusBadge({ status }: { status: PolicyStatus }) {
  const { t } = useI18n();
  return (
    <Badge variant="outline" className={cn("h-5 border px-1.5 text-[11px]", STATUS_CLASS[status])}>
      {t.status[status]}
    </Badge>
  );
}
