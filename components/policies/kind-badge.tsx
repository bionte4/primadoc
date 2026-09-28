import type { PolicyType } from "@prisma/client";
import { TIER_LABEL } from "@/lib/document-kind";
import { cn } from "@/lib/utils";

const TYPE_CLASS: Record<PolicyType, string> = {
  POLICY: "bg-slate-100 text-slate-700",
  PROCEDURE: "bg-sky-50 text-sky-800",
  TECHNICAL_GUIDE: "bg-violet-50 text-violet-800",
};

export function KindBadge({ type }: { type: PolicyType }) {
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md px-1.5 text-[11px] font-medium",
        TYPE_CLASS[type],
      )}
    >
      {TIER_LABEL[type]}
    </span>
  );
}
