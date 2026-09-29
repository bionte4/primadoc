import { listApprovalQueue } from "@/actions/policies";
import { PolicyTable } from "@/components/policies/policy-table";
import { getDictionary } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

export default async function ApprovalPage({
  searchParams,
}: {
  searchParams: Promise<{ mine?: string }>;
}) {
  const user = await requireUser();
  const mine = (await searchParams).mine === "1";
  const policies = await listApprovalQueue(user, mine);
  const { t } = await getDictionary();

  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">
          {mine ? t.approval.mineTitle : t.approval.queueTitle}
        </h1>
        <p className="text-xs text-muted-foreground">
          {mine ? t.approval.mineDescription : t.approval.queueDescription}
        </p>
      </div>
      <PolicyTable
        policies={policies}
        user={user}
        emptyLabel={
          mine ? t.approval.mineEmpty : t.approval.queueEmpty
        }
      />
    </div>
  );
}
