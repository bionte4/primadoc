export const sessionCookieName = process.env.NEXTAUTH_URL?.startsWith("https://")
  ? "__Secure-prismadoc-session-token"
  : "prismadoc-session-token";

export function safeCallbackUrl(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/policies";
  return value;
}
