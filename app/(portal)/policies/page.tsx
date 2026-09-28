import { PolicyDirectory } from "@/components/policies/policy-directory";
import { requireUser } from "@/lib/session";

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string; department?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const documentType = params.type ?? "";
  const department = params.department ?? "";

  return (
    <PolicyDirectory
      user={user}
      query={query}
      status={status}
      documentType={documentType}
      department={department}
      basePath="/policies"
      title="Dokumen"
      description="Cari menurut departemen dan tier: kebijakan, prosedur, atau petunjuk teknis."
    />
  );
}
