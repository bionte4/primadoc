"use client";

import { createContext, useContext } from "react";
import { id, type Dictionary } from "@/lib/i18n/dictionary";
import type { Locale } from "@/lib/i18n/labels";

const I18nContext = createContext<{ locale: Locale; t: Dictionary }>({ locale: "id", t: id });

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Dictionary;
  children: React.ReactNode;
}) {
  return <I18nContext.Provider value={{ locale, t: messages }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
