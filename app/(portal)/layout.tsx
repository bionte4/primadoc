import { AppShell } from "@/components/app-shell";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/session";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const unreadReminders = await prisma.notification.count({
    where: { userId: user.id, readAt: null },
  });
  return (
    <AppShell user={user} unreadReminders={unreadReminders}>
      {children}
    </AppShell>
  );
}
