import { redirect } from "next/navigation";
import { PolicyDashboard } from "@/components/policies/policy-dashboard";
import { requireUser } from "@/lib/session";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  if (params.q || params.status) {
    const next = new URLSearchParams();
    if (params.q) next.set("q", params.q);
    if (params.status) next.set("status", params.status);
    redirect(`/policies?${next.toString()}`);
  }

  return <PolicyDashboard user={user} />;
}
