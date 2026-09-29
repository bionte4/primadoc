import type { Locale } from "@/lib/i18n/labels";

function dateLocale(locale: Locale) {
  return locale === "en" ? "en-US" : "id-ID";
}

export function formatDate(value: Date | string, locale: Locale = "id") {
  return new Intl.DateTimeFormat(dateLocale(locale), {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string, locale: Locale = "id") {
  return new Intl.DateTimeFormat(dateLocale(locale), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date(value));
}
