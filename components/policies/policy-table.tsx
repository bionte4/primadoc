import Link from "next/link";
import type { Department, PolicyStatus, PolicyType } from "@prisma/client";
import { PolicyRowActions } from "@/components/policies/policy-actions";
import { KindBadge } from "@/components/policies/kind-badge";
import { StatusBadge } from "@/components/policies/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getDepartmentLabels } from "@/lib/department-labels";
import { formatDateTime } from "@/lib/format";
import { categoryLabel, getDictionary, localizeDepartments } from "@/lib/i18n";
import { canDecide, canDeletePolicy, canSubmitForReview, type SessionUser } from "@/lib/rbac";
import { formatVersion } from "@/lib/version";

export type PolicyListItem = {
  id: string;
  documentNumber: string;
  title: string;
  category: string;
  version: string;
  status: PolicyStatus;
  type: PolicyType;
  department: Department;
  needsReview: boolean;
  authorId: string;
  updatedAt: Date;
  author: { name: string };
  primaryApproverId: string | null;
  delegatedApproverId: string | null;
  snippet: { text: string; match: boolean }[] | null;
};

export async function PolicyTable({
  policies,
  user,
  emptyLabel,
}: {
  policies: PolicyListItem[];
  user: SessionUser;
  emptyLabel: string;
}) {
  const [{ locale, t }, storedLabels] = await Promise.all([getDictionary(), getDepartmentLabels()]);
  const labels = localizeDepartments(storedLabels, t);

  return (
    <div className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
      <Table className="min-w-[760px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-8 px-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t.table.number}
            </TableHead>
            <TableHead className="h-8 px-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t.table.title}
            </TableHead>
            <TableHead className="h-8 px-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t.table.category}
            </TableHead>
            <TableHead className="h-8 px-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t.table.version}
            </TableHead>
            <TableHead className="h-8 px-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t.table.department}
            </TableHead>
            <TableHead className="h-8 px-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t.table.tier}
            </TableHead>
            <TableHead className="h-8 px-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t.table.status}
            </TableHead>
            <TableHead className="h-8 px-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t.table.author}
            </TableHead>
            <TableHead className="h-8 px-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t.table.updated}
            </TableHead>
            <TableHead className="h-8 px-2.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t.table.actions}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {policies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="h-16 text-center text-sm text-muted-foreground">
                {emptyLabel}
              </TableCell>
            </TableRow>
          ) : (
            policies.map((policy) => (
              <TableRow key={policy.id}>
                <TableCell className="px-2.5 py-1.5 font-mono text-xs font-medium whitespace-nowrap">
                  <Link href={`/policies/${policy.id}`} className="hover:underline">
                    {policy.documentNumber}
                  </Link>
                </TableCell>
                <TableCell className="max-w-80 px-2.5 py-1.5 whitespace-normal">
                  <Link href={`/policies/${policy.id}`} className="line-clamp-2 leading-5 hover:underline">
                    {policy.title}
                  </Link>
                  {policy.snippet && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-muted-foreground">
                      {policy.snippet.map((part, index) =>
                        part.match ? (
                          <mark key={index} className="bg-amber-200/80 text-foreground">
                            {part.text}
                          </mark>
                        ) : (
                          <span key={index}>{part.text}</span>
                        ),
                      )}
                    </p>
                  )}
                </TableCell>
                <TableCell className="px-2.5 py-1.5 text-muted-foreground">{categoryLabel(policy.category, t)}</TableCell>
                <TableCell className="px-2.5 py-1.5 whitespace-nowrap">
                  {formatVersion(policy.version)}
                </TableCell>
                <TableCell className="px-2.5 py-1.5 whitespace-nowrap">
                  {labels[policy.department]}
                </TableCell>
                <TableCell className="px-2.5 py-1.5 whitespace-nowrap">
                  <KindBadge type={policy.type} />
                </TableCell>
                <TableCell className="px-2.5 py-1.5 whitespace-nowrap">
                  <StatusBadge status={policy.status} />
                  {policy.needsReview && (
                    <p className="mt-0.5 text-[11px] text-amber-700">{t.table.needsReview}</p>
                  )}
                </TableCell>
                <TableCell className="px-2.5 py-1.5">{policy.author.name}</TableCell>
                <TableCell className="px-2.5 py-1.5 text-xs whitespace-nowrap text-muted-foreground">
                  {formatDateTime(policy.updatedAt, locale)}
                </TableCell>
                <TableCell className="px-2.5 py-1.5 whitespace-nowrap">
                  <PolicyRowActions
                    policyId={policy.id}
                    canSubmit={canSubmitForReview(
                      user.role,
                      policy.status,
                      policy.authorId === user.id,
                    )}
                    canDecide={canDecide(user.role, policy.status, user.id, policy)}
                    canDelete={canDeletePolicy(
                      user.role,
                      policy.status,
                      policy.authorId === user.id,
                    )}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
