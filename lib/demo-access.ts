/** Demo accounts stay on the login page outside production unless this flag says otherwise. */
export function showDemoAccounts() {
  if (process.env.SHOW_DEMO_ACCOUNTS === "true") return true;
  if (process.env.SHOW_DEMO_ACCOUNTS === "false") return false;
  return process.env.NODE_ENV !== "production";
}
