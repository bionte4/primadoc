const JAKARTA = "Asia/Jakarta";

/** Midnight in Jakarta for a calendar day, stored as UTC. */
export function parseExpiryDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day, -7, 0, 0));
  if (Number.isNaN(date.getTime())) return null;
  return expiryInputValue(date) === value.trim() ? date : null;
}

export function expiryInputValue(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function jakartaToday(offsetDays = 0, now = new Date()) {
  const today = expiryInputValue(now);
  const parsed = parseExpiryDate(today);
  if (!parsed) return now;
  if (offsetDays === 0) return parsed;
  const shifted = new Date(parsed);
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  return shifted;
}
