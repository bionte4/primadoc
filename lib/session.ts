import { auth } from "@/lib/auth";
import type { SessionUser } from "@/lib/rbac";
import { redirect } from "next/navigation";

export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) {
    redirect("/login");
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
}
