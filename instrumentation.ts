export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startReviewEscalationSchedule } = await import("@/lib/review-schedule");
    startReviewEscalationSchedule();
  }
}
