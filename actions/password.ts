"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getDictionary } from "@/lib/i18n";
import { fill } from "@/lib/i18n/labels";
import { BCRYPT_ROUNDS, passwordIssue, passwordIssueMessage } from "@/lib/password-policy";
import { recordAudit } from "@/lib/record-audit";
import { requireUser } from "@/lib/session";

export type PasswordState = { error?: string; ok?: boolean };

export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const actor = await requireUser();
  const { t } = await getDictionary();
  const account = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { id: true, name: true, email: true, password: true },
  });
  if (!account?.password) return { error: t.errors.noLocalPassword };

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!current || !(await bcrypt.compare(current, account.password))) {
    return { error: t.errors.passwordCurrent };
  }
  if (next !== confirm) return { error: t.validation.passwordMismatch };
  if (next === current) return { error: t.validation.passwordSame };

  const issue = passwordIssue(next, account);
  if (issue) return { error: passwordIssueMessage(issue, t.validation) };

  await prisma.user.update({
    where: { id: account.id },
    data: {
      password: await bcrypt.hash(next, BCRYPT_ROUNDS),
      mustChangePassword: false,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });
  await recordAudit(actor.id, "CHANGE_PASSWORD", fill(t.users.auditPassword, { name: account.name }));
  return { ok: true };
}
