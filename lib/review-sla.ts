const DAY_MS = 24 * 60 * 60 * 1000;

export function reviewSlaDays() {
  const parsed = Number(process.env.REVIEW_SLA_DAYS ?? "3");
  if (!Number.isFinite(parsed)) return 3;
  return Math.min(30, Math.max(1, Math.floor(parsed)));
}

export function reviewDeadline(startedAt: Date, now = new Date()) {
  return startedAt.getTime() <= now.getTime() - reviewSlaDays() * DAY_MS;
}
