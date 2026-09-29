"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, parseLocale } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/labels";

export async function setLocale(locale: Locale) {
  const store = await cookies();
  store.set(LOCALE_COOKIE, parseLocale(locale), {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}
