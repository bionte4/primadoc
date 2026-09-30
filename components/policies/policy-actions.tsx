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
import { useI18n } from "@/components/i18n-provider";

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
  const { t } = useI18n();
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
        <Button nativeButton={false} className="touch-target" render={<Link href={`/policies/${policyId}/edit`} />}>
          {t.actions.editDraft}
        </Button>
      )}
      {canSubmit && (
        <NoteDialog
          title={t.actions.submitTitle}
          description={t.actions.submitBody}
          confirmLabel={t.actions.submitTitle}
          action={submitForReview.bind(null, policyId)}
        />
      )}
      {canReview && (
        <NoteDialog
          title={t.actions.noteTitle}
          description={t.actions.noteBody}
          confirmLabel={t.actions.saveNote}
          notesRequired
          action={addReviewNote.bind(null, policyId)}
        />
      )}
      {canDecide && (
        <>
          <NoteDialog
            title={t.actions.approveTitle}
            description={t.actions.approveBody}
            confirmLabel={t.actions.approveTitle}
            action={approvePolicy.bind(null, policyId)}
          />
          <NoteDialog
            title={t.actions.rejectTitle}
            description={t.actions.rejectBody}
            confirmLabel={t.actions.rejectTitle}
            notesRequired
            destructive
            action={rejectPolicy.bind(null, policyId)}
          />
        </>
      )}
      {canRevise && <ReviseButton policyId={policyId} />}
      {canArchive && (
        <NoteDialog
          title={t.actions.archiveTitle}
          description={t.actions.archiveBody}
          confirmLabel={t.actions.archiveTitle}
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
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-1">
      <Button
        size="xs"
        variant="outline"
        className="touch-target"
        nativeButton={false}
        render={<Link href={`/policies/${policyId}`} />}
      >
        {t.table.view}
      </Button>
      {canSubmit && (
        <NoteDialog
          title={t.actions.submitTitle}
          description={t.actions.submitBody}
          confirmLabel={t.actions.submitTitle}
          size="xs"
          action={submitForReview.bind(null, policyId)}
        />
      )}
      {canDecide && (
        <>
          <NoteDialog
            title={t.actions.approveTitle}
            description={t.actions.approveBody}
            confirmLabel={t.actions.approveTitle}
            size="xs"
            action={approvePolicy.bind(null, policyId)}
          />
          <NoteDialog
            title={t.actions.rejectTitle}
            description={t.actions.rejectBody}
            confirmLabel={t.actions.rejectTitle}
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
  const { t } = useI18n();

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ok]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button size={size} variant={destructive ? "destructive" : "outline"} className="touch-target" />}
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
            placeholder={notesRequired ? t.common.requiredNotes : t.common.optionalNotes}
            className="min-h-24"
          />
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" variant={destructive ? "destructive" : "default"} className="touch-target" disabled={pending}>
              {pending ? t.common.processing : confirmLabel}
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
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size={size} variant="destructive" className="touch-target" />}>{t.actions.delete}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.actions.deleteTitle}</DialogTitle>
          <DialogDescription>
            {t.actions.deleteBody}
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" variant="destructive" className="touch-target" disabled={pending}>
              {pending ? t.actions.deleting : t.actions.delete}
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
  const { t } = useI18n();

  return (
    <form action={formAction}>
      {state.error && <p className="mb-2 text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant="outline" className="touch-target" disabled={pending}>
        {pending ? t.actions.revising : t.actions.revise}
      </Button>
    </form>
  );
}
