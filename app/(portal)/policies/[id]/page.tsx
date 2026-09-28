import Link from "next/link";
import { notFound } from "next/navigation";
import { getAttestationReport, getMyAttestation } from "@/actions/attestations";
import { getPolicyForUser, listDocumentAncestors, listDocumentChildren, listPolicyVersions } from "@/actions/policies";
import { AttestButton } from "@/components/policies/attest-button";
import { DocumentViewer } from "@/components/policies/document-viewer";
import { KindBadge } from "@/components/policies/kind-badge";
import { PolicyActions } from "@/components/policies/policy-actions";
import { StatusBadge } from "@/components/policies/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AUDIT_LABEL, ROLE_LABEL, WORKFLOW_LABEL } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { childActionLabel, DEPARTMENT_LABEL, TIER_LABEL, TYPE_LABEL } from "@/lib/document-kind";
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
  const [ancestors, children] = await Promise.all([
    listDocumentAncestors(policy.parentId),
    listDocumentChildren(user, policy.id),
  ]);
  const childLabel = childActionLabel(policy.type);

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
            Kembali ke dashboard
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
                const label = `${TYPE_LABEL[item.type]} ${item.documentNumber}`;
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
                {TYPE_LABEL[policy.type]} {policy.documentNumber}
              </span>
            </p>
          )}
          {policy.needsReview && (
            <p className="mt-1 text-xs text-amber-800">
              Induk dokumen ini sudah diarsipkan. Tinjau apakah turunan ini masih berlaku.
            </p>
          )}
          {policy.status === "IN_REVIEW" && policy.delegatedApprover && (
            <p className="mt-1 text-xs text-muted-foreground">
              Dilimpahkan ke {policy.delegatedApprover.name} karena approver utama tidak memutuskan dalam{" "}
              {reviewSlaDays()} hari.
            </p>
          )}
          {policy.status === "IN_REVIEW" && policy.primaryApprover && !policy.delegatedApprover && (
            <p className="mt-1 text-xs text-muted-foreground">
              Approver utama: {policy.primaryApprover.name}. Batas keputusan {reviewSlaDays()} hari.
            </p>
          )}
          {!policy.isCurrent && currentVersion && (
            <p className="mt-1 text-xs text-muted-foreground">
              Ini versi lama.{" "}
              <Link href={`/policies/${currentVersion.id}`} className="text-primary hover:underline">
                Buka {formatVersion(currentVersion.version)}
              </Link>
            </p>
          )}
          <div className="mt-2 flex gap-1">
            <Link
              href={`/policies/${policy.id}`}
              className={`rounded-md px-2 py-1 text-xs ${tab === "detail" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              Detail
            </Link>
            <Link
              href={`/policies/${policy.id}?tab=riwayat`}
              className={`rounded-md px-2 py-1 text-xs ${tab === "riwayat" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              Riwayat Versi
            </Link>
          </div>
        </div>

        {tab === "riwayat" ? (
          <section className="rounded-lg bg-card ring-1 ring-foreground/10">
            <Table className="min-w-0">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Versi</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Diperbarui</TableHead>
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
                        <span className="ml-1.5 text-[11px] text-muted-foreground">Terbaru</span>
                      )}
                    </TableCell>
                    <TableCell className="px-2.5 py-1.5 whitespace-normal">{item.title}</TableCell>
                    <TableCell className="px-2.5 py-1.5">
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="px-2.5 py-1.5 text-xs whitespace-nowrap text-muted-foreground">
                      {formatDateTime(item.updatedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        ) : (
          <>

        <section className="grid gap-x-4 gap-y-2 rounded-lg bg-card px-3 py-2.5 ring-1 ring-foreground/10 sm:grid-cols-4">
          <Meta label="Departemen" value={DEPARTMENT_LABEL[policy.department]} />
          <Meta label="Tier" value={TIER_LABEL[policy.type]} />
          <Meta label="Kategori" value={policy.category} />
          <Meta label="Penulis" value={`${policy.author.name} · ${ROLE_LABEL[policy.author.role]}`} />
          <Meta label="Dibuat" value={formatDateTime(policy.createdAt)} />
          <Meta label="Diperbarui" value={formatDateTime(policy.updatedAt)} />
        </section>

        {(children.length > 0 || childLabel) && (
          <section className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Dokumen turunan
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
              <p className="mt-1.5 text-xs text-muted-foreground">Belum ada turunan.</p>
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
                      <span className="text-[11px] text-amber-700">Perlu ditinjau</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <section className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Deskripsi
          </h2>
          <p className="mt-1.5 text-sm leading-5 whitespace-pre-wrap">{policy.description}</p>
        </section>

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
              Baca dokumen
            </h2>
            <p className="mt-1.5 text-xs text-muted-foreground">Belum ada berkas terlampir.</p>
          </section>
        )}

        {report && (
          <section className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Rekap pembacaan
            </h2>
            <p className="mt-1.5 text-[13px]">
              {report.total - report.unread.length} dari {report.total} staf sudah membaca.
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Belum membaca</p>
                {report.unread.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">Semua staf sudah membaca.</p>
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
                <p className="text-[11px] font-medium text-muted-foreground">Sudah membaca</p>
                {report.read.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">Belum ada konfirmasi.</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {report.read.map((person) => (
                      <li key={person.id} className="text-[13px] leading-5">
                        {person.name}
                        <span className="block text-[11px] text-muted-foreground">
                          {formatDateTime(person.readAt)}
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
              Riwayat workflow
            </h2>
            {policy.approvals.length === 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">Belum ada perpindahan status.</p>
            ) : (
              <ol className="mt-2 space-y-2.5 border-l border-border pl-3">
                {policy.approvals.map((step) => (
                  <li key={step.id} className="relative">
                    <span className="absolute top-1.5 -left-[15px] size-1.5 rounded-full bg-primary" />
                    <p className="text-[13px] font-medium">
                      Langkah {step.stepOrder} · {WORKFLOW_LABEL[step.status]}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {step.approver.name} · {ROLE_LABEL[step.approver.role]} ·{" "}
                      {formatDateTime(step.createdAt)}
                    </p>
                    {step.notes && <p className="mt-0.5 text-[13px] leading-5">{step.notes}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Audit log
            </h2>
            {policy.auditLogs.length === 0 ? (
              <p className="mt-1.5 text-xs text-muted-foreground">Belum ada catatan audit.</p>
            ) : (
              <ul className="mt-1 divide-y">
                {policy.auditLogs.map((log) => (
                  <li key={log.id} className="py-1.5">
                    <p className="text-[13px] font-medium">{AUDIT_LABEL[log.action] ?? log.action}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {log.user.name} · {formatDateTime(log.timestamp)}
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
          Aksi
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
              Tidak ada aksi untuk peran Anda pada status ini.
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
