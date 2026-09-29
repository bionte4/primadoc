import { AiSearchForm } from "@/components/search/ai-search-form";
import { requireUser } from "@/lib/session";

export default async function AiSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireUser();
  const question = (await searchParams).q?.trim() ?? "";
  return <AiSearchForm initialQuestion={question} />;
}
