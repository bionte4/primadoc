import Link from "next/link";
import { countPolicies, listPolicies } from "@/actions/policies";
import { TaxonomyFilters } from "@/components/policies/policy-filters";
import { StatusBadge } from "@/components/policies/status-badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { POLICY_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { DEPARTMENT_LABEL } from "@/lib/document-kind";
import { formatDateTime } from "@/lib/format";
import {
  canAccessApprovalQueue,
  canCreatePolicy,
  type SessionUser,
} from "@/lib/rbac";
import type { PolicyStatus } from "@prisma/client";

export async function PolicyDashboard({
  user,
  department = "",
  documentType = "",
}: {
  user: SessionUser;
  department?: string;
  documentType?: string;
}) {
  const [policies, counts] = await Promise.all([
    listPolicies(user, "", "", documentType, department),
    countPolicies(user, documentType, department),
  ]);
  const total = POLICY_STATUSES.reduce((sum, status) => sum + counts[status], 0);
  const focus = focusStatuses(user.role);
  const attention = policies.filter((policy) => focus.includes(policy.status)).slice(0, 5);
  const recent = policies.slice(0, 5);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          <p className="text-xs text-muted-foreground">{focusCopy(user.role)}</p>
        </div>
        {canCreatePolicy(user.role) && (
          <Button size="sm" nativeButton={false} render={<Link href="/policies/new" />}>
            <Plus />
            Buat Kebijakan Baru
          </Button>
        )}
      </div>

      <TaxonomyFilters department={department} documentType={documentType} />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Semua" value={total} href={statHref("/policies", department, documentType)} />
        {POLICY_STATUSES.map((status) => (
          <Stat
            key={status}
            label={STATUS_LABEL[status]}
            value={counts[status]}
            href={statHref(`/policies?status=${status}`, department, documentType)}
          />
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <section className="rounded-lg bg-card ring-1 ring-foreground/10">
          <header className="flex items-center justify-between gap-3 px-3 py-2">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {focusTitle(user.role)}
            </h2>
            <Link href={focusHref(user.role, department, documentType)} className="text-xs font-medium text-primary hover:underline">
              Lihat semua
            </Link>
          </header>
          <PolicyLinks
            policies={attention}
            emptyLabel={
              user.role === "STAFF"
                ? "Tidak ada draf atau penolakan yang menunggu Anda."
                : "Tidak ada dokumen yang sedang dalam review."
            }
          />
        </section>

        <section className="rounded-lg bg-card ring-1 ring-foreground/10">
          <header className="flex items-center justify-between gap-3 px-3 py-2">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Diperbarui baru-baru ini
            </h2>
            <Link
              href={statHref("/policies", department, documentType)}
              className="text-xs font-medium text-primary hover:underline"
            >
              Daftar dokumen
            </Link>
          </header>
          <PolicyLinks policies={recent} emptyLabel="Belum ada kebijakan." />
        </section>
      </div>
    </div>
  );
}

function focusStatuses(role: SessionUser["role"]): PolicyStatus[] {
  if (role === "STAFF") return ["DRAFT", "REJECTED"];
  return ["IN_REVIEW"];
}

function focusTitle(role: SessionUser["role"]) {
  if (role === "STAFF") return "Perlu Anda lanjutkan";
  if (canAccessApprovalQueue(role) && role !== "ADMIN") return "Menunggu keputusan";
  return "Sedang dalam review";
}

function focusCopy(role: SessionUser["role"]) {
  if (role === "STAFF") return "Draf dan penolakan Anda, plus kebijakan yang baru berubah.";
  if (role === "APPROVER") return "Dokumen yang menunggu keputusan Anda.";
  if (role === "REVIEWER") return "Dokumen yang sedang dalam review.";
  return "Ringkasan siklus dokumen. Daftar lengkap ada di menu kebijakan.";
}

function focusHref(role: SessionUser["role"], department: string, documentType: string) {
  if (role === "STAFF") return statHref("/policies?status=DRAFT", department, documentType);
  if (canAccessApprovalQueue(role)) return "/approval";
  return statHref("/policies?status=IN_REVIEW", department, documentType);
}

function statHref(href: string, department: string, documentType: string) {
  const url = new URL(href, "http://prismadoc.local");
  if (department) url.searchParams.set("department", department);
  if (documentType) url.searchParams.set("type", documentType);
  return `${url.pathname}${url.search}`;
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="rounded-lg bg-card px-3 py-2.5 ring-1 ring-foreground/10 hover:bg-muted/60"
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
    </Link>
  );
}

function PolicyLinks({
  policies,
  emptyLabel,
}: {
  policies: {
    id: string;
    title: string;
    documentNumber: string;
    department: keyof typeof DEPARTMENT_LABEL;
    status: PolicyStatus;
    updatedAt: Date;
  }[];
  emptyLabel: string;
}) {
  if (policies.length === 0) {
    return <p className="px-3 pb-3 text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <ul className="border-t border-border/70">
      {policies.map((policy) => (
        <li key={policy.id} className="border-b border-border/70 last:border-b-0">
          <Link
            href={`/policies/${policy.id}`}
            className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-muted/50"
          >
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium">{policy.title}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {policy.documentNumber} · {DEPARTMENT_LABEL[policy.department]} · {formatDateTime(policy.updatedAt)}
              </span>
            </span>
            <StatusBadge status={policy.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
