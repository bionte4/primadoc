import { PolicyDirectory } from "@/components/policies/policy-directory";
import { getDictionary } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; type?: string; department?: string; scope?: string; ai?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const status = params.status ?? "";
  const documentType = params.type ?? "";
  const department = params.department ?? "";
  const scope = params.scope === "mine" ? "mine" : "";
  const contentSearch = params.ai === "1";
  const { t } = await getDictionary();
  const heading = directoryHeading(documentType, scope, contentSearch, t);

  return (
    <PolicyDirectory
      user={user}
      query={query}
      status={status}
      documentType={documentType}
      department={department}
      scope={scope}
      contentSearch={contentSearch}
      basePath="/policies"
      title={heading.title}
      description={heading.description}
    />
  );
}

import type { Dictionary } from "@/lib/i18n/dictionary";

function directoryHeading(documentType: string, scope: string, contentSearch: boolean, t: Dictionary) {
  if (scope === "mine") {
    return { title: t.directory.mineTitle, description: t.directory.mineDescription };
  }
  if (documentType === "POLICY") {
    return { title: t.nav.policy, description: t.directory.policyDescription };
  }
  if (documentType === "PROCEDURE") {
    return { title: t.nav.procedure, description: t.directory.procedureDescription };
  }
  if (documentType === "TECHNICAL_GUIDE") {
    return { title: t.nav.guide, description: t.directory.guideDescription };
  }
  if (contentSearch) {
    return { title: t.directory.aiTitle, description: t.directory.aiDescription };
  }
  return { title: t.directory.title, description: t.directory.description };
}
