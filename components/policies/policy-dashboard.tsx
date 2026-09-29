import Link from "next/link";
import { ClipboardCheck, Sparkles, Upload } from "lucide-react";
import { countPolicies } from "@/actions/policies";
import { TaxonomyFilters } from "@/components/policies/policy-filters";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricGrid, type MetricItem } from "@/components/ui/metric-grid";
import { getDepartmentLabels } from "@/lib/department-labels";
import { formatDate } from "@/lib/format";
import { fill, getDictionary, localizeDepartments } from "@/lib/i18n";
import { listExpiringPolicies, listPendingReviews, type MonitorItem } from "@/lib/monitoring";
import { canAccessApprovalQueue, canCreatePolicy, canRevise, type SessionUser } from "@/lib/rbac";
import type { Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/labels";
import type { PolicyStatus } from "@prisma/client";

const QUICK_STATUSES = ["DRAFT", "IN_REVIEW", "APPROVED", "ARCHIVED"] as const satisfies readonly PolicyStatus[];

export async function PolicyDashboard({
  user,
  department = "",
  documentType = "",
}: {
  user: SessionUser;
  department?: string;
  documentType?: string;
}) {
  const [counts, storedLabels, pending, expiring, { locale, t }] = await Promise.all([
    countPolicies(user, documentType, department),
    getDepartmentLabels(),
    listPendingReviews(user, documentType, department),
    listExpiringPolicies(user, documentType, department),
    getDictionary(),
  ]);
  const labels = localizeDepartments(storedLabels, t);
  const name = user.name?.trim() || t.dashboard.guest;

  return (
    <div className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)] items-start gap-3 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">{fill(t.dashboard.welcome, { name })}</h1>
          <p className="text-xs text-muted-foreground">
            {t.dashboard.summary}
          </p>
        </div>

        <TaxonomyFilters department={department} documentType={documentType} labels={labels} />

        <MetricGrid
          title={t.dashboard.statusTitle}
          description={t.dashboard.statusDescription}
          columns={4}
          loadingLabel={t.common.loadingMetrics}
          emptyLabel={t.common.noMetrics}
          metrics={overviewMetrics(counts, department, documentType, t)}
        />

        <section aria-labelledby="quick-actions-heading" className="flex flex-col gap-2">
          <h2 id="quick-actions-heading" className="text-sm font-medium">
            {t.dashboard.quick}
          </h2>
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-3">
            {canCreatePolicy(user.role) && (
              <Button className="justify-start" nativeButton={false} render={<Link href="/policies/new" />}>
                <Upload />
                {t.dashboard.upload}
              </Button>
            )}
            <Button
              variant="outline"
              className="justify-start"
              nativeButton={false}
              render={<Link href="/ai-search" />}
            >
              <Sparkles />
              {t.dashboard.ai}
            </Button>
            {canAccessApprovalQueue(user.role) && (
              <Button
                variant="outline"
                className="justify-start"
                nativeButton={false}
                render={<Link href="/approval" />}
              >
                <ClipboardCheck />
                {t.dashboard.awaiting}
              </Button>
            )}
          </div>
        </section>
      </div>

      <aside className="flex min-w-0 flex-col gap-3" aria-label={t.dashboard.side}>
        <MonitorCard
          title={t.dashboard.pendingTitle}
          description={t.dashboard.pendingDescription}
          emptyLabel={t.dashboard.pendingEmpty}
          items={pending}
          user={user}
          locale={locale}
          updateLabel={t.dashboard.update}
          endsLabel={t.dashboard.ends}
        />
        <MonitorCard
          title={t.dashboard.expiringTitle}
          description={t.dashboard.expiringDescription}
          emptyLabel={t.dashboard.expiringEmpty}
          items={expiring}
          user={user}
          showExpiry
          locale={locale}
          updateLabel={t.dashboard.update}
          endsLabel={t.dashboard.ends}
        />
      </aside>
    </div>
  );
}

function overviewMetrics(
  counts: Record<PolicyStatus, number>,
  department: string,
  documentType: string,
  t: Dictionary,
): MetricItem[] {
  return QUICK_STATUSES.map((status) => ({
    id: status,
    label: t.status[status],
    hint: status === "APPROVED" ? t.status.published : undefined,
    value: counts[status],
    href: statHref(`/policies?status=${status}`, department, documentType),
  }));
}

function statHref(href: string, department: string, documentType: string) {
  const url = new URL(href, "http://prismadoc.local");
  if (department) url.searchParams.set("department", department);
  if (documentType) url.searchParams.set("type", documentType);
  return `${url.pathname}${url.search}`;
}

function MonitorCard({
  title,
  description,
  emptyLabel,
  items,
  user,
  showExpiry = false,
  locale,
  updateLabel,
  endsLabel,
}: {
  title: string;
  description: string;
  emptyLabel: string;
  items: MonitorItem[];
  user: SessionUser;
  showExpiry?: boolean;
  locale: Locale;
  updateLabel: string;
  endsLabel: string;
}) {
  return (
    <Card size="sm" className="dark:bg-card">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">{emptyLabel}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <li key={item.id} className="border-b border-border/70 pb-2 last:border-b-0 last:pb-0">
                <Link
                  href={`/policies/${item.id}`}
                  className="block min-w-0 rounded-md outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="block truncate text-[13px] font-medium">{item.title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">
                    {item.documentNumber}
                    {showExpiry && item.expiresAt
                      ? ` · ${fill(endsLabel, { date: formatDate(item.expiresAt, locale) })}`
                      : ""}
                  </span>
                </Link>
                {showExpiry && canRevise(user.role, item.status, item.authorId === user.id) ? (
                  <Button
                    size="xs"
                    variant="outline"
                    className="mt-1.5"
                    nativeButton={false}
                    render={<Link href={`/policies/${item.id}`} />}
                  >
                    {updateLabel}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
