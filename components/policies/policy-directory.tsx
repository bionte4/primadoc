import { Plus } from "lucide-react";
import Link from "next/link";
import { countPolicies, listPolicies } from "@/actions/policies";
import { PolicyFilters } from "@/components/policies/policy-filters";
import { PolicyTable } from "@/components/policies/policy-table";
import { Button } from "@/components/ui/button";
import { POLICY_STATUSES } from "@/lib/constants";
import { getDepartmentLabels } from "@/lib/department-labels";
import { getDictionary, localizeDepartments } from "@/lib/i18n";
import { canCreatePolicy, type SessionUser } from "@/lib/rbac";
import { cn } from "@/lib/utils";

export async function PolicyDirectory({
  user,
  query,
  status,
  documentType,
  department,
  scope = "",
  contentSearch = false,
  basePath,
  title,
  description,
}: {
  user: SessionUser;
  query: string;
  status: string;
  documentType: string;
  department: string;
  scope?: string;
  contentSearch?: boolean;
  basePath: "/policies";
  title: string;
  description: string;
}) {
  const [policies, counts, storedLabels, { t }] = await Promise.all([
    listPolicies(user, query, status, documentType, department, scope),
    countPolicies(user, documentType, department, scope),
    getDepartmentLabels(),
    getDictionary(),
  ]);
  const labels = localizeDepartments(storedLabels, t);
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
            {t.directory.create}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <CountChip
          label={t.common.all}
          value={total}
          href={chipHref(basePath, "", documentType, department, scope, contentSearch)}
          active={!status}
        />
        {POLICY_STATUSES.map((item) => (
          <CountChip
            key={item}
            label={t.status[item]}
            value={counts[item]}
            href={chipHref(basePath, item, documentType, department, scope, contentSearch)}
            active={status === item}
          />
        ))}
      </div>

      <PolicyFilters
        query={query}
        status={status}
        documentType={documentType}
        department={department}
        scope={scope}
        contentSearch={contentSearch}
        labels={labels}
      />

      <PolicyTable
        policies={policies}
        user={user}
        emptyLabel={t.directory.empty}
      />
    </div>
  );
}

function chipHref(
  basePath: string,
  status: string,
  documentType: string,
  department: string,
  scope: string,
  contentSearch: boolean,
) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (documentType) params.set("type", documentType);
  if (department) params.set("department", department);
  if (scope === "mine") params.set("scope", "mine");
  if (contentSearch) params.set("ai", "1");
  const search = params.toString();
  return search ? `${basePath}?${search}` : basePath;
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
