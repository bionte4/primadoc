"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import {
  addReviewNote,
  approvePolicy,
  archivePolicy,
  deletePolicy,
  rejectPolicy,
  revisePolicy,
  submitForReview,
  type ActionState,
} from "@/actions/policies";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function PolicyActions({
  policyId,
  canEdit,
  canSubmit,
  canDecide,
  canReview,
  canArchive,
  canRevise,
  canDelete,
}: {
  policyId: string;
  canEdit: boolean;
  canSubmit: boolean;
  canDecide: boolean;
  canReview: boolean;
  canArchive: boolean;
  canRevise: boolean;
  canDelete: boolean;
}) {
  if (
    !canEdit &&
    !canSubmit &&
    !canDecide &&
    !canReview &&
    !canArchive &&
    !canRevise &&
    !canDelete
  ) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1.5">
      {canEdit && (
        <Button nativeButton={false} render={<Link href={`/policies/${policyId}/edit`} />}>
          Ubah draf
        </Button>
      )}
      {canSubmit && (
        <NoteDialog
          title="Ajukan Review"
          description="Dokumen berpindah ke status dalam review. Catatan bersifat opsional."
          confirmLabel="Ajukan Review"
          action={submitForReview.bind(null, policyId)}
        />
      )}
      {canReview && (
        <NoteDialog
          title="Catatan review"
          description="Rekomendasi ini tercatat di audit log dan terlihat oleh approver."
          confirmLabel="Simpan catatan"
          notesRequired
          action={addReviewNote.bind(null, policyId)}
        />
      )}
      {canDecide && (
        <>
          <NoteDialog
            title="Approve"
            description="Persetujuan mengunci isi dokumen sampai dibuka sebagai revisi."
            confirmLabel="Approve"
            action={approvePolicy.bind(null, policyId)}
          />
          <NoteDialog
            title="Reject"
            description="Dokumen kembali menjadi draf. Catatan wajib diisi."
            confirmLabel="Reject"
            notesRequired
            destructive
            action={rejectPolicy.bind(null, policyId)}
          />
        </>
      )}
      {canRevise && <ReviseButton policyId={policyId} />}
      {canArchive && (
        <NoteDialog
          title="Arsipkan"
          description="Dokumen yang diarsipkan tidak lagi menjadi versi aktif."
          confirmLabel="Arsipkan"
          action={archivePolicy.bind(null, policyId)}
        />
      )}
      {canDelete && <DeleteButton policyId={policyId} />}
    </div>
  );
}

export function PolicyRowActions({
  policyId,
  canSubmit,
  canDecide,
  canDelete,
}: {
  policyId: string;
  canSubmit: boolean;
  canDecide: boolean;
  canDelete: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      <Button
        size="xs"
        variant="outline"
        nativeButton={false}
        render={<Link href={`/policies/${policyId}`} />}
      >
        Lihat
      </Button>
      {canSubmit && (
        <NoteDialog
          title="Ajukan Review"
          description="Dokumen berpindah ke status dalam review. Catatan bersifat opsional."
          confirmLabel="Ajukan Review"
          size="xs"
          action={submitForReview.bind(null, policyId)}
        />
      )}
      {canDecide && (
        <>
          <NoteDialog
            title="Approve"
            description="Persetujuan mengunci isi dokumen sampai dibuka sebagai revisi."
            confirmLabel="Approve"
            size="xs"
            action={approvePolicy.bind(null, policyId)}
          />
          <NoteDialog
            title="Reject"
            description="Dokumen kembali menjadi draf. Catatan wajib diisi."
            confirmLabel="Reject"
            notesRequired
            destructive
            size="xs"
            action={rejectPolicy.bind(null, policyId)}
          />
        </>
      )}
      {canDelete && <DeleteButton policyId={policyId} size="xs" />}
    </div>
  );
}

function NoteDialog({
  title,
  description,
  confirmLabel,
  notesRequired = false,
  destructive = false,
  size = "default",
  action,
}: {
  title: string;
  description: string;
  confirmLabel: string;
  notesRequired?: boolean;
  destructive?: boolean;
  size?: "xs" | "default";
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {});

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size={size} variant={destructive ? "destructive" : "outline"} />}
      >
        {title}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <Textarea
            name="notes"
            required={notesRequired}
            placeholder={notesRequired ? "Tulis catatan" : "Catatan (opsional)"}
            className="min-h-24"
          />
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending}>
              {pending ? "Memproses..." : confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteButton({
  policyId,
  size = "default",
}: {
  policyId: string;
  size?: "xs" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionState) => deletePolicy(policyId),
    {},
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={size} variant="destructive" />}>Hapus</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Hapus kebijakan</DialogTitle>
          <DialogDescription>
            Draf atau dokumen yang ditolak akan dihapus bersama riwayat workflow-nya.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Menghapus..." : "Hapus"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ReviseButton({ policyId }: { policyId: string }) {
  const [state, formAction, pending] = useActionState(
    async (_prev: ActionState) => revisePolicy(policyId),
    {},
  );

  return (
    <form action={formAction}>
      {state.error && <p className="mb-2 text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Membuka revisi..." : "Buat revisi"}
      </Button>
    </form>
  );
}
