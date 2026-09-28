import { PolicyDirectory } from "@/components/policies/policy-directory";
import { requireUser } from "@/lib/session";

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = params.status ?? "";

  return (
    <PolicyDirectory
      user={user}
      query={query}
      status={status}
      basePath="/policies"
      title="Kebijakan"
      description={
        user.role === "STAFF"
          ? "Draf Anda dan kebijakan yang sudah disetujui."
          : "Seluruh dokumen beserta status siklus hidupnya."
      }
    />
  );
}
