import Link from "next/link";
import { notFound } from "next/navigation";
import { getAttestationReport, getMyAttestation } from "@/actions/attestations";
import { getPolicyForUser, listDocumentAncestors, listDocumentChildren, listPolicyVersions } from "@/actions/policies";
import { AttestButton } from "@/components/policies/attest-button";
import { DocumentViewer } from "@/components/policies/document-viewer";
import { KindBadge } from "@/components/policies/kind-badge";
import { PolicyActions } from "@/components/policies/policy-actions";
import { PolicySummary } from "@/components/policies/policy-summary";
import { StatusBadge } from "@/components/policies/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatDateTime } from "@/lib/format";
import { getDepartmentLabels } from "@/lib/department-labels";
import {
  auditLabel,
  categoryLabel,
  childAction,
  fill,
  getDictionary,
  localizeDepartments,
  tierLabel,
  typeLabel,
  workflowLabel,
} from "@/lib/i18n";
import {
  canAddReviewNote,
  canArchive,
  canAttest,
  canCreatePolicy,
  canDecide,
  canDeletePolicy,
  canEditPolicy,
  canManageUsers,
  canRevise,
  canSubmitForReview,
  canViewPolicy,
} from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import { loadDocumentView } from "@/lib/document-view";
import { reviewSlaDays } from "@/lib/review-sla";
import { formatVersion } from "@/lib/version";

export default async function PolicyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const tab = (await searchParams).tab === "riwayat" ? "riwayat" : "detail";
  const policy = await getPolicyForUser(user, id);
  if (!policy) notFound();
  const versions = await listPolicyVersions(policy.versionGroupId);
  const currentVersion = versions.find((item) => item.isCurrent);
  const [ancestors, children, dictionary, storedLabels] = await Promise.all([
    listDocumentAncestors(policy.parentId),
    listDocumentChildren(user, policy.id),
    getDictionary(),
    getDepartmentLabels(),
  ]);
  const { locale, t } = dictionary;
  const departmentLabels = localizeDepartments(storedLabels, t);
  const childLabel = childAction(policy.type, t);

  const isAuthor = policy.authorId === user.id;
  const showAttest = canAttest(user.role);
  const [mine, report, documentView] = await Promise.all([
    showAttest ? getMyAttestation(user.id, policy.id) : Promise.resolve(null),
    canManageUsers(user.role) ? getAttestationReport(policy.id) : Promise.resolve(null),
    policy.fileUrl ? loadDocumentView(policy.fileUrl) : Promise.resolve(null),
  ]);
  const hasWorkflowAction =
    policy.isCurrent &&
    (canEditPolicy(user.role, policy.status, isAuthor) ||
      canSubmitForReview(user.role, policy.status, isAuthor) ||
      canDecide(user.role, policy.status, user.id, policy) ||
      canAddReviewNote(user.role, policy.status) ||
      canArchive(user.role, policy.status, isAuthor) ||
      canRevise(user.role, policy.status, isAuthor) ||
      canDeletePolicy(user.role, policy.status, isAuthor));

  return (
    <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="space-y-3">
        <div>
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
            {t.detail.back}
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <KindBadge type={policy.type} />
            <StatusBadge status={policy.status} />
            <span className="font-mono text-xs text-muted-foreground">
              {policy.documentNumber}
            </span>
            <span className="text-xs text-muted-foreground">{formatVersion(policy.version)}</span>
          </div>
          <h1 className="mt-1 text-lg font-semibold tracking-tight">{policy.title}</h1>
          {ancestors.length > 0 && (
            <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              {ancestors.map((item) => {
                const visible = canViewPolicy(user.role, item.status, item.authorId === user.id);
                const label = `${typeLabel(item.type, t)} ${item.documentNumber}`;
                return (
                  <span key={item.id} className="inline-flex items-center gap-1">
                    {visible ? (
                      <Link href={`/policies/${item.id}`} className="hover:text-foreground hover:underline">
                        {label}
                      </Link>
                    ) : (
                      <span>{label}</span>
                    )}
                    <span aria-hidden>→</span>
                  </span>
                );
              })}
              <span className="text-foreground">
                {typeLabel(policy.type, t)} {policy.documentNumber}
              </span>
            </p>
          )}
          {policy.needsReview && (
            <p className="mt-1 text-xs text-amber-800">
              {t.detail.needsReview}
            </p>
          )}
          {policy.status === "IN_REVIEW" && policy.delegatedApprover && (
            <p className="mt-1 text-xs text-muted-foreground">
              {fill(t.detail.delegated, {
                name: policy.delegatedApprover.name,
                days: reviewSlaDays(),
              })}
            </p>
          )}
          {policy.status === "IN_REVIEW" && policy.primaryApprover && !policy.delegatedApprover && (
            <p className="mt-1 text-xs text-muted-foreground">
              {fill(t.detail.primary, {
                name: policy.primaryApprover.name,
                days: reviewSlaDays(),
              })}
            </p>
          )}
          {!policy.isCurrent && currentVersion && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t.detail.oldVersion}{" "}
              <Link href={`/policies/${currentVersion.id}`} className="text-primary hover:underline">
                {fill(t.detail.openVersion, { version: formatVersion(currentVersion.version) })}
              </Link>
            </p>
          )}
          <div className="mt-2 flex gap-1">
            <Link
              href={`/policies/${policy.id}`}
              className={`rounded-md px-2 py-1 text-xs ${tab === "detail" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {t.detail.tabDetail}
            </Link>
            <Link
              href={`/policies/${policy.id}?tab=riwayat`}
              className={`rounded-md px-2 py-1 text-xs ${tab === "riwayat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              {t.detail.tabHistory}
            </Link>
          </div>
        </div>

        {tab === "riwayat" ? (
          <section className="rounded-lg bg-card ring-1 ring-foreground/10">
            <Table className="min-w-0">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t.table.version}</TableHead>
                  <TableHead>{t.table.title}</TableHead>
                  <TableHead>{t.table.status}</TableHead>
                  <TableHead>{t.table.updated}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="px-2.5 py-1.5 whitespace-nowrap">
                      <Link href={`/policies/${item.id}`} className="font-medium hover:underline">
                        {formatVersion(item.version)}
                      </Link>
                      {item.isCurrent && (
                        <span className="ml-1.5 text-[11px] text-muted-foreground">{t.common.current}</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2.5 py-1.5 whitespace-normal">{item.title}</TableCell>
                    <TableCell className="px-2.5 py-1.5">
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="px-2.5 py-1.5 text-xs whitespace-nowrap text-muted-foreground">
                      {formatDateTime(item.updatedAt, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        ) : (
          <>

        <section className="grid gap-x-4 gap-y-2 rounded-lg bg-card px-3 py-2.5 ring-1 ring-foreground/10 sm:grid-cols-4">
          <Meta label={t.detail.department} value={departmentLabels[policy.department]} />
          <Meta label={t.detail.expires} value={policy.expiresAt ? formatDate(policy.expiresAt, locale) : t.detail.noExpiry} />
          <Meta label={t.detail.tier} value={tierLabel(policy.type, t)} />
          <Meta label={t.detail.category} value={categoryLabel(policy.category, t)} />
          <Meta label={t.detail.author} value={`${policy.author.name} · ${t.role[policy.author.role]}`} />
          <Meta label={t.detail.created} value={formatDateTime(policy.createdAt, locale)} />
          <Meta label={t.detail.updated} value={formatDateTime(policy.updatedAt, locale)} />
        </section>

        {(children.length > 0 || childLabel) && (
          <section className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {t.detail.children}
              </h2>
              {childLabel &&
                policy.isCurrent &&
                policy.status === "APPROVED" &&
                canCreatePolicy(user.role) && (
                  <Link
                    href={`/policies/new?parent=${policy.id}`}
                    className="text-xs text-primary hover:underline"
                  >
                    {childLabel}
                  </Link>
                )}
            </div>
            {children.length === 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">{t.detail.noChildren}</p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {children.map((child) => (
                  <li key={child.id} className="flex flex-wrap items-center gap-2 py-1.5">
                    <KindBadge type={child.type} />
                    <Link href={`/policies/${child.id}`} className="text-sm hover:underline">
                      <span className="font-mono text-xs">{child.documentNumber}</span> {child.title}
                    </Link>
                    <StatusBadge status={child.status} />
                    <span className="text-xs text-muted-foreground">{formatVersion(child.version)}</span>
                    {child.needsReview && (
                      <span className="text-[11px] text-amber-700">{t.table.needsReview}</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t.detail.description}
          </h2>
          <p className="mt-1.5 text-sm leading-5 whitespace-pre-wrap">{policy.description}</p>
        </section>

        <PolicySummary policyId={policy.id} />

        {policy.fileUrl && documentView ? (
          <DocumentViewer
            fileUrl={policy.fileUrl}
            fileName={policy.fileName}
            view={documentView}
            viewer={user}
          />
        ) : (
          <section className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t.detail.read}
            </h2>
            <p className="mt-1.5 text-xs text-muted-foreground">{t.detail.noFile}</p>
          </section>
        )}

        {report && (
          <section className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t.detail.attestTitle}
            </h2>
            <p className="mt-1.5 text-[13px]">
              {fill(t.detail.attestCount, {
                read: report.total - report.unread.length,
                total: report.total,
              })}
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">{t.detail.unread}</p>
                {report.unread.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">{t.detail.allRead}</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {report.unread.map((person) => (
                      <li key={person.id} className="text-[13px] leading-5">
                        {person.name}
                        <span className="block text-[11px] text-muted-foreground">{person.email}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">{t.detail.readList}</p>
                {report.read.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">{t.detail.noConfirm}</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {report.read.map((person) => (
                      <li key={person.id} className="text-[13px] leading-5">
                        {person.name}
                        <span className="block text-[11px] text-muted-foreground">
                          {formatDateTime(person.readAt, locale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </section>
        )}

        <div className="grid gap-3 xl:grid-cols-2">
          <section className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t.detail.workflow}
            </h2>
            {policy.approvals.length === 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">{t.detail.noWorkflow}</p>
            ) : (
              <ol className="mt-2 space-y-2.5 border-l border-border pl-3">
                {policy.approvals.map((step) => (
                  <li key={step.id} className="relative">
                    <span className="absolute top-1.5 -left-[15px] size-1.5 rounded-full bg-primary" />
                    <p className="text-[13px] font-medium">
                      {fill(t.detail.step, { order: step.stepOrder })} · {workflowLabel(step.status, t)}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {step.approver.name} · {t.role[step.approver.role]} ·{" "}
                      {formatDateTime(step.createdAt, locale)}
                    </p>
                    {step.notes && <p className="mt-0.5 text-[13px] leading-5">{step.notes}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {t.detail.audit}
            </h2>
            {policy.auditLogs.length === 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">{t.detail.noAudit}</p>
            ) : (
              <ul className="mt-1 divide-y">
                {policy.auditLogs.map((log) => (
                  <li key={log.id} className="py-1.5">
                    <p className="text-[13px] font-medium">{auditLabel(log.action, t)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {log.user.name} · {formatDateTime(log.timestamp, locale)}
                    </p>
                    {log.details && <p className="text-[13px] leading-5">{log.details}</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
          </>
        )}
      </div>

      <aside className="h-fit rounded-lg bg-card p-3 ring-1 ring-foreground/10 lg:sticky lg:top-3">
        <h2 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t.detail.actions}
        </h2>
        {showAttest && (
          <div className="mb-2">
            <AttestButton policyId={policy.id} readAt={mine?.readAt ?? null} />
          </div>
        )}
        <PolicyActions
          policyId={policy.id}
          canEdit={policy.isCurrent && canEditPolicy(user.role, policy.status, isAuthor)}
          canSubmit={policy.isCurrent && canSubmitForReview(user.role, policy.status, isAuthor)}
          canDecide={policy.isCurrent && canDecide(user.role, policy.status, user.id, policy)}
          canReview={policy.isCurrent && canAddReviewNote(user.role, policy.status)}
          canArchive={policy.isCurrent && canArchive(user.role, policy.status, isAuthor)}
          canRevise={policy.isCurrent && canRevise(user.role, policy.status, isAuthor)}
          canDelete={policy.isCurrent && canDeletePolicy(user.role, policy.status, isAuthor)}
        />
        {!hasWorkflowAction && !showAttest && (
            <p className="text-xs text-muted-foreground">
              {t.detail.noActions}
            </p>
          )}
      </aside>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-[13px] leading-5">{value}</p>
    </div>
  );
}
