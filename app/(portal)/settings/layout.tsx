import { SettingsNav } from "@/components/settings/settings-nav";
import { canManageUsers } from "@/lib/rbac";
import { requireUser } from "@/lib/session";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex w-full flex-col gap-3">
      {canManageUsers(user.role) ? <SettingsNav /> : null}
      {children}
    </div>
  );
}
