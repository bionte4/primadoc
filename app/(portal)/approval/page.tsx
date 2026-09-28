import { listPolicies } from "@/actions/policies";
import { PolicyTable } from "@/components/policies/policy-table";
import { requireUser } from "@/lib/session";

export default async function ApprovalPage() {
  const user = await requireUser();
  const policies = await listPolicies(user, "", "IN_REVIEW");

  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Persetujuan</h1>
        <p className="text-xs text-muted-foreground">
          Dokumen yang sedang menunggu review atau keputusan.
        </p>
      </div>
      <PolicyTable
        policies={policies}
        user={user}
        emptyLabel="Tidak ada dokumen dalam review."
      />
    </div>
  );
}
