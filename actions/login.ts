"use server";

import { findInvitedUser } from "@/lib/invited-user";

export async function loginFailureHint(email: string): Promise<"locked" | "mismatch"> {
  const user = await findInvitedUser(email);
  if (user?.lockedUntil && user.lockedUntil > new Date()) return "locked";
  return "mismatch";
}
