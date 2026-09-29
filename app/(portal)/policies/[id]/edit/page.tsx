import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPolicyForUser, listParentOptions } from "@/actions/policies";
import { PolicyForm } from "@/components/policies/policy-form";
import { POLICY_CATEGORIES } from "@/lib/constants";
import { getDepartmentLabels } from "@/lib/department-labels";
import { expiryInputValue } from "@/lib/expiry";
import { fill, getDictionary, localizeDepartments, typeLabel } from "@/lib/i18n";
import { canEditPolicy } from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import type { PolicyFormValues } from "@/lib/validators/policy";

export default async function EditPolicyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const policy = await getPolicyForUser(user, id);
  if (!policy) notFound();
  if (!policy.isCurrent || !canEditPolicy(user.role, policy.status, policy.authorId === user.id)) {
    redirect(`/policies/${id}`);
  }

  const [parents, storedLabels, { t }] = await Promise.all([
    listParentOptions(user),
    getDepartmentLabels(),
    getDictionary(),
  ]);
  const departmentLabels = localizeDepartments(storedLabels, t);
  const category = POLICY_CATEGORIES.includes(policy.category as (typeof POLICY_CATEGORIES)[number])
    ? (policy.category as PolicyFormValues["category"])
    : "Umum";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href={`/policies/${policy.id}`}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        {t.form.backDetail}
      </Link>
      <h1 className="mt-1 text-lg font-semibold tracking-tight">
        {fill(t.form.editTitle, { type: typeLabel(policy.type, t).toLowerCase() })}
      </h1>
      <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
        {t.form.editLead}
      </p>
      <div className="rounded-lg bg-card p-4 ring-1 ring-foreground/10">
        <PolicyForm
          mode="edit"
          policyId={policy.id}
          currentFileName={policy.fileName}
          currentVersion={policy.version}
          parents={parents}
          departmentLabels={departmentLabels}
          lockType
          defaultValues={{
            title: policy.title,
            documentNumber: policy.documentNumber,
            category,
            department: policy.department,
            description: policy.description,
            type: policy.type,
            parentId: policy.parentId ?? "",
            expiresAt: policy.expiresAt ? expiryInputValue(policy.expiresAt) : "",
          }}
        />
      </div>
    </div>
  );
}
