import Link from "next/link";
import { getDictionary } from "@/lib/i18n";

export default async function PolicyNotFound() {
  const { t } = await getDictionary();
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{t.detail.notFound}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t.detail.notFoundBody}</p>
      <Link href="/policies" className="mt-4 inline-block text-sm font-medium text-primary">
        {t.detail.backList}
      </Link>
    </div>
  );
}
