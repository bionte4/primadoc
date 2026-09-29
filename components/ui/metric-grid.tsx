import Link from "next/link";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type MetricTrend = {
  direction: "up" | "down" | "flat";
  label: string;
};

export type MetricItem = {
  id: string;
  label: string;
  value: number | string;
  hint?: string;
  href?: string;
  trend?: MetricTrend;
};

export type MetricGridProps = {
  title: string;
  description?: string;
  metrics: readonly MetricItem[];
  isLoading?: boolean;
  emptyLabel?: string;
  loadingLabel?: string;
  /** How many tiles sit on one row at the widest breakpoint. */
  columns?: 4 | 6;
  className?: string;
};

const TREND_ICON = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
} as const;

export function MetricGrid({
  title,
  description,
  metrics,
  isLoading = false,
  emptyLabel = "Belum ada angka untuk ditampilkan.",
  loadingLabel = "Memuat metrik",
  columns = 6,
  className,
}: MetricGridProps) {
  const headingId = `metric-grid-${slug(title)}`;

  return (
    <Card size="sm" className={cn("dark:bg-card", className)}>
      <CardHeader>
        <CardTitle id={headingId}>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>
        <section aria-labelledby={headingId} aria-busy={isLoading}>
          {isLoading ? (
            <MetricSkeleton columns={columns} label={loadingLabel} />
          ) : metrics.length === 0 ? (
            <p className="text-sm text-muted-foreground">{emptyLabel}</p>
          ) : (
            <ul className={metricColumns(columns)}>
              {metrics.map((metric) => (
                <li key={metric.id}>
                  <MetricTile metric={metric} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function MetricTile({ metric }: { metric: MetricItem }) {
  const className =
    "flex h-full flex-col rounded-lg bg-background px-3 py-2.5 ring-1 ring-foreground/10 outline-none transition-colors hover:bg-muted/70 focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-background/40 dark:hover:bg-muted/40";
  const body = <MetricBody metric={metric} />;

  if (!metric.href) {
    return <div className={className}>{body}</div>;
  }

  return (
    <Link href={metric.href} className={className} aria-label={accessibleName(metric)}>
      {body}
    </Link>
  );
}

function MetricBody({ metric }: { metric: MetricItem }) {
  return (
    <>
      <p className="text-[11px] text-muted-foreground">{metric.label}</p>
      <p className="mt-0.5 text-xl font-semibold tabular-nums tracking-tight text-foreground">
        {metric.value}
      </p>
      {metric.trend ? <MetricTrendBadge trend={metric.trend} /> : null}
      {metric.hint ? <p className="mt-1 text-[11px] text-muted-foreground">{metric.hint}</p> : null}
    </>
  );
}

function MetricTrendBadge({ trend }: { trend: MetricTrend }) {
  const Icon = TREND_ICON[trend.direction];
  return (
    <p
      className={cn(
        "mt-1 inline-flex items-center gap-1 text-[11px] font-medium",
        trend.direction === "up" && "text-emerald-700 dark:text-emerald-300",
        trend.direction === "down" && "text-rose-700 dark:text-rose-300",
        trend.direction === "flat" && "text-muted-foreground",
      )}
    >
      <Icon aria-hidden className="size-3" />
      <span>{trend.label}</span>
    </p>
  );
}

function MetricSkeleton({ columns, label }: { columns: 4 | 6; label: string }) {
  return (
    <div>
      <p className="sr-only">{label}</p>
      <ul aria-hidden className={metricColumns(columns)}>
        {Array.from({ length: columns }, (_, index) => (
          <li
            key={index}
            className="h-[4.5rem] animate-pulse rounded-lg bg-muted dark:bg-muted/60"
          />
        ))}
      </ul>
    </div>
  );
}

function accessibleName(metric: MetricItem) {
  const trend = metric.trend ? `, ${metric.trend.label}` : "";
  const hint = metric.hint ? `, ${metric.hint}` : "";
  return `${metric.label}: ${metric.value}${trend}${hint}`;
}

function metricColumns(columns: 4 | 6) {
  return cn(
    "grid grid-cols-2 gap-2",
    columns === 4 ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-3 lg:grid-cols-6",
  );
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
