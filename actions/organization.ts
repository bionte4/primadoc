"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { DEPARTMENTS, DEPARTMENT_LABEL } from "@/lib/document-kind";
import { canManageUsers } from "@/lib/rbac";
import { recordAudit } from "@/lib/record-audit";
import { requireUser } from "@/lib/session";
import { getDictionary } from "@/lib/i18n";
import { fill } from "@/lib/i18n/labels";

export type DepartmentNameState = { error?: string; ok?: boolean };

export async function updateDepartmentName(
  _prev: DepartmentNameState,
  formData: FormData,
): Promise<DepartmentNameState> {
  const user = await requireUser();
  const { t } = await getDictionary();
  if (!canManageUsers(user.role)) return { error: t.errors.adminDepartment };

  const parsed = z.object({
    code: z.enum(DEPARTMENTS),
    name: z.string().trim().min(1, t.validation.departmentNameRequired).max(40, t.validation.departmentNameMax),
  }).safeParse({
    code: formData.get("code"),
    name: formData.get("name"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? t.errors.invalidData };

  const current = await prisma.departmentLabel.findUnique({
    where: { code: parsed.data.code },
    select: { name: true },
  });
  const before = current?.name ?? DEPARTMENT_LABEL[parsed.data.code];
  if (before === parsed.data.name) return { ok: true };

  await prisma.departmentLabel.upsert({
    where: { code: parsed.data.code },
    create: parsed.data,
    update: { name: parsed.data.name },
  });
  await recordAudit(
    user.id,
    "UPDATE_DEPARTMENT",
    fill(t.organization.auditName, {
      code: parsed.data.code,
      before,
      after: parsed.data.name,
    }),
  );

  revalidatePath("/settings/organization");
  revalidatePath("/policies");
  revalidatePath("/dashboard");
  return { ok: true };
}
