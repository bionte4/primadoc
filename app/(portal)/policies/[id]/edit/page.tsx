import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPolicyForUser, listParentOptions } from "@/actions/policies";
import { PolicyForm } from "@/components/policies/policy-form";
import { POLICY_CATEGORIES } from "@/lib/constants";
import { TYPE_LABEL } from "@/lib/document-kind";
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

  const parents = await listParentOptions(user);
  const category = POLICY_CATEGORIES.includes(policy.category as (typeof POLICY_CATEGORIES)[number])
    ? (policy.category as PolicyFormValues["category"])
    : "Umum";

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link
        href={`/policies/${policy.id}`}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Kembali ke detail
      </Link>
      <h1 className="mt-1 text-lg font-semibold tracking-tight">Ubah {TYPE_LABEL[policy.type].toLowerCase()}</h1>
      <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
        Menyimpan membuat versi baru. Versi sebelumnya tetap bisa dibuka.
      </p>
      <div className="rounded-lg bg-card p-4 ring-1 ring-foreground/10">
        <PolicyForm
          mode="edit"
          policyId={policy.id}
          currentFileName={policy.fileName}
          currentVersion={policy.version}
          parents={parents}
          lockType
          defaultValues={{
            title: policy.title,
            documentNumber: policy.documentNumber,
            category,
            department: policy.department,
            description: policy.description,
            type: policy.type,
            parentId: policy.parentId ?? "",
          }}
        />
      </div>
    </div>
  );
}
