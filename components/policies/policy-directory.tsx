import { Plus } from "lucide-react";
import Link from "next/link";
import { countPolicies, listPolicies } from "@/actions/policies";
import { PolicyFilters } from "@/components/policies/policy-filters";
import { PolicyTable } from "@/components/policies/policy-table";
import { Button } from "@/components/ui/button";
import { POLICY_STATUSES, STATUS_LABEL } from "@/lib/constants";
import { canCreatePolicy, type SessionUser } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export async function PolicyDirectory({
  user,
  query,
  status,
  basePath,
  title,
  description,
}: {
  user: SessionUser;
  query: string;
  status: string;
  basePath: "/policies";
  title: string;
  description: string;
}) {
  const [policies, counts] = await Promise.all([
    listPolicies(user, query, status),
    countPolicies(user),
  ]);
  const total = POLICY_STATUSES.reduce((sum, item) => sum + counts[item], 0);

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {canCreatePolicy(user.role) && (
          <Button size="sm" nativeButton={false} render={<Link href="/policies/new" />}>
            <Plus />
            Buat Kebijakan Baru
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <CountChip label="Semua" value={total} href={basePath} active={!status} />
        {POLICY_STATUSES.map((item) => (
          <CountChip
            key={item}
            label={STATUS_LABEL[item]}
            value={counts[item]}
            href={`${basePath}?status=${item}`}
            active={status === item}
          />
        ))}
      </div>

      <PolicyFilters query={query} status={status} />

      <PolicyTable
        policies={policies}
        user={user}
        emptyLabel="Tidak ada kebijakan yang cocok dengan filter ini."
      />
    </div>
  );
}

function CountChip({
  label,
  value,
  href,
  active,
}: {
  label: string;
  value: number;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md bg-card px-2 text-xs ring-1 ring-foreground/10 hover:bg-muted/70",
        active && "bg-primary text-primary-foreground ring-primary hover:bg-primary",
      )}
    >
      <span>{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </Link>
  );
}
