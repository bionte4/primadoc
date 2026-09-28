import cron from "node-cron";
import { escalateStaleReviews } from "@/lib/review-escalation";

const globalForCron = globalThis as { reviewEscalationCron?: boolean };

export function startReviewEscalationSchedule() {
  if (globalForCron.reviewEscalationCron) return;
  const expression = process.env.REVIEW_CRON?.trim() || "0 1 * * *";
  if (!cron.validate(expression)) {
    console.error(`[review-escalation] REVIEW_CRON tidak valid: ${expression}`);
    return;
  }

  globalForCron.reviewEscalationCron = true;
  cron.schedule(
    expression,
    () => {
      void escalateStaleReviews().catch((error) => {
        console.error("[review-escalation]", error);
      });
    },
    { timezone: "Asia/Jakarta" },
  );
}
