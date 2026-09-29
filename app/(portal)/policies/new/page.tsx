import Link from "next/link";
import { redirect } from "next/navigation";
import { childDraftFor, listParentOptions } from "@/actions/policies";
import { PolicyForm } from "@/components/policies/policy-form";
import { POLICY_CATEGORIES } from "@/lib/constants";
import { getDepartmentLabels } from "@/lib/department-labels";
import { fill, getDictionary, localizeDepartments, typeLabel } from "@/lib/i18n";
import { canCreatePolicy } from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import type { PolicyFormValues } from "@/lib/validators/policy";

export default async function NewPolicyPage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string }>;
}) {
  const user = await requireUser();
  if (!canCreatePolicy(user.role)) redirect("/policies");
  const parentId = (await searchParams).parent?.trim() ?? "";
  const [parents, child, storedLabels, { t }] = await Promise.all([
    listParentOptions(user),
    parentId ? childDraftFor(user, parentId) : Promise.resolve(null),
    getDepartmentLabels(),
    getDictionary(),
  ]);
  const departmentLabels = localizeDepartments(storedLabels, t);

  if (parentId && !child) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/policies" className="text-xs text-muted-foreground hover:text-foreground">
          {t.form.backDocuments}
        </Link>
        <h1 className="mt-1 text-lg font-semibold tracking-tight">{t.form.parentNotReady}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t.form.parentNotReadyBody}
        </p>
      </div>
    );
  }

  const category = POLICY_CATEGORIES.includes(child?.category as (typeof POLICY_CATEGORIES)[number])
    ? (child?.category as PolicyFormValues["category"])
    : "Umum";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href={child ? `/policies/${child.parentId}` : "/policies"}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        {child ? fill(t.form.backParent, { number: child.parentNumber }) : t.form.backDocuments}
      </Link>
      <h1 className="mt-1 text-lg font-semibold tracking-tight">
        {child ? fill(t.form.newChild, { type: typeLabel(child.type, t) }) : t.form.newDocument}
      </h1>
      <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
        {child
          ? fill(t.form.childLead, { number: child.parentNumber, title: child.parentTitle })
          : t.form.newLead}
      </p>
      <div className="rounded-lg bg-card p-4 ring-1 ring-foreground/10">
        <PolicyForm
          mode="create"
          parents={parents}
          departmentLabels={departmentLabels}
          defaultValues={
            child
              ? {
                  title: "",
                  documentNumber: "",
                  category,
                  department: child.department,
                  description: "",
                  type: child.type,
                  parentId: child.parentId,
                  expiresAt: "",
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
