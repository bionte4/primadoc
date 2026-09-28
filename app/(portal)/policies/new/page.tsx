import Link from "next/link";
import { redirect } from "next/navigation";
import { childDraftFor, listParentOptions } from "@/actions/policies";
import { PolicyForm } from "@/components/policies/policy-form";
import { POLICY_CATEGORIES } from "@/lib/constants";
import { TYPE_LABEL } from "@/lib/document-kind";
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
  const [parents, child] = await Promise.all([
    listParentOptions(user),
    parentId ? childDraftFor(user, parentId) : Promise.resolve(null),
  ]);

  if (parentId && !child) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <Link href="/policies" className="text-xs text-muted-foreground hover:text-foreground">
          Kembali ke dokumen
        </Link>
        <h1 className="mt-1 text-lg font-semibold tracking-tight">Induk belum siap</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Prosedur hanya bisa dibuat dari kebijakan yang sudah disetujui. Petunjuk teknis hanya bisa
          dibuat dari prosedur yang sudah disetujui.
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
        {child ? `Kembali ke ${child.parentNumber}` : "Kembali ke dokumen"}
      </Link>
      <h1 className="mt-1 text-lg font-semibold tracking-tight">
        {child ? `${TYPE_LABEL[child.type]} baru` : "Dokumen baru"}
      </h1>
      <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
        {child
          ? `Turunan dari ${child.parentNumber} · ${child.parentTitle}. Nomor diisi otomatis.`
          : "Pilih jenis dokumen. Prosedur dan petunjuk teknis perlu dokumen induk yang sudah disetujui."}
      </p>
      <div className="rounded-lg bg-card p-4 ring-1 ring-foreground/10">
        <PolicyForm
          mode="create"
          parents={parents}
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
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
