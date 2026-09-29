import type { Dictionary } from "@/lib/i18n/dictionary";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;
export const BCRYPT_ROUNDS = 12;
export const MAX_FAILED_LOGINS = 5;
export const LOCK_MINUTES = 15;

export type PasswordIssue = "short" | "long" | "email" | "name";

export function passwordIssue(
  password: string,
  identity: { email: string; name: string },
): PasswordIssue | null {
  if (password.length < PASSWORD_MIN_LENGTH) return "short";
  if (password.length > PASSWORD_MAX_LENGTH) return "long";

  const normalized = password.toLowerCase();
  if (normalized === identity.email.trim().toLowerCase()) return "email";
  const name = identity.name.trim().toLowerCase();
  if (name && normalized === name) return "name";
  return null;
}

export function passwordIssueMessage(issue: PasswordIssue, validation: Dictionary["validation"]) {
  switch (issue) {
    case "short":
      return validation.passwordShort;
    case "long":
      return validation.passwordLong;
    case "email":
      return validation.passwordEmail;
    case "name":
      return validation.passwordName;
  }
}
