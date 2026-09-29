import { cache } from "react";
import { cookies } from "next/headers";
import { en, id, type Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/labels";

export const LOCALE_COOKIE = "prismadoc-locale";
export type { Locale };

export function parseLocale(value: string | undefined | null): Locale {
  return value === "en" ? "en" : "id";
}

export function dictionaryFor(locale: Locale): Dictionary {
  return locale === "en" ? en : id;
}

export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  return parseLocale(store.get(LOCALE_COOKIE)?.value);
});

export const getDictionary = cache(async () => {
  const locale = await getLocale();
  return { locale, t: dictionaryFor(locale) };
});

export {
  auditLabel,
  categoryLabel,
  childAction,
  fill,
  localizeDepartments,
  roleLabel,
  statusLabel,
  thrownFileError,
  tierLabel,
  typeLabel,
  workflowLabel,
} from "@/lib/i18n/labels";
