import { Download } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAttestationReport, getMyAttestation } from "@/actions/attestations";
import { getPolicyForUser, listPolicyVersions } from "@/actions/policies";
import { AttestButton } from "@/components/policies/attest-button";
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
import {
  canAddReviewNote,
  canArchive,
  canAttest,
  canDecide,
  canDeletePolicy,
  canEditPolicy,
  canManageUsers,
  canRevise,
  canSubmitForReview,
} from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import { canPreview } from "@/lib/upload";
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

  const isAuthor = policy.authorId === user.id;
  const previewable = policy.fileUrl ? canPreview(policy.fileUrl) : false;
  const showAttest = canAttest(user.role);
  const [mine, report] = await Promise.all([
    showAttest ? getMyAttestation(user.id, policy.id) : Promise.resolve(null),
    canManageUsers(user.role) ? getAttestationReport(policy.id) : Promise.resolve(null),
  ]);
  const hasWorkflowAction =
    policy.isCurrent &&
    (canEditPolicy(user.role, policy.status, isAuthor) ||
      canSubmitForReview(user.role, policy.status, isAuthor) ||
      canDecide(user.role, policy.status) ||
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
            <StatusBadge status={policy.status} />
            <span className="font-mono text-xs text-muted-foreground">
              {policy.documentNumber}
            </span>
            <span className="text-xs text-muted-foreground">{formatVersion(policy.version)}</span>
          </div>
          <h1 className="mt-1 text-lg font-semibold tracking-tight">{policy.title}</h1>
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
          <Meta label="Kategori" value={policy.category} />
          <Meta label="Penulis" value={`${policy.author.name} · ${ROLE_LABEL[policy.author.role]}`} />
          <Meta label="Dibuat" value={formatDateTime(policy.createdAt)} />
          <Meta label="Diperbarui" value={formatDateTime(policy.updatedAt)} />
        </section>

        <section className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
          <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Deskripsi
          </h2>
          <p className="mt-1.5 text-sm leading-5 whitespace-pre-wrap">{policy.description}</p>
        </section>

        <section className="rounded-lg bg-card p-3 ring-1 ring-foreground/10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Berkas
            </h2>
            {policy.fileUrl && (
              <a
                href={`/api/files/${policy.fileUrl}`}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Download className="size-3.5" />
                Unduh
              </a>
            )}
          </div>
          {policy.fileUrl ? (
            <div className="mt-2 space-y-2">
              <p className="text-xs text-muted-foreground">{policy.fileName}</p>
              {previewable && policy.fileUrl.endsWith(".pdf") && (
                <iframe
                  title="Pratinjau dokumen"
                  src={`/api/files/${policy.fileUrl}?inline=1`}
                  className="h-72 w-full rounded-md border bg-white"
                />
              )}
              {previewable && !policy.fileUrl.endsWith(".pdf") && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/files/${policy.fileUrl}?inline=1`}
                  alt={policy.fileName ?? "Pratinjau berkas"}
                  className="max-h-72 rounded-md border object-contain"
                />
              )}
            </div>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">Belum ada berkas terlampir.</p>
          )}
        </section>

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
          canDecide={policy.isCurrent && canDecide(user.role, policy.status)}
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
