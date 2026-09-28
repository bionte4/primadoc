import Link from "next/link";
import { redirect } from "next/navigation";
import { PolicyForm } from "@/components/policies/policy-form";
import { canCreatePolicy } from "@/lib/rbac";
import { requireUser } from "@/lib/session";

export default async function NewPolicyPage() {
  const user = await requireUser();
  if (!canCreatePolicy(user.role)) redirect("/policies");

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">
        Kembali ke dashboard
      </Link>
      <h1 className="mt-1 text-lg font-semibold tracking-tight">Kebijakan baru</h1>
      <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
        Dokumen disimpan sebagai draf versi v1.0 sampai diajukan untuk review.
      </p>
      <div className="rounded-lg bg-card p-4 ring-1 ring-foreground/10">
        <PolicyForm mode="create" />
      </div>
    </div>
  );
}
