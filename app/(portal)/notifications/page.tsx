import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { requireUser } from "@/lib/session";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await prisma.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { policy: { select: { id: true, documentNumber: true } } },
  });

  if (notifications.some((item) => !item.readAt)) {
    await prisma.notification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Pengingat</h1>
        <p className="text-xs text-muted-foreground">
          Batas waktu review dan pelimpahan persetujuan.
        </p>
      </div>
      <div className="overflow-hidden rounded-lg bg-card ring-1 ring-foreground/10">
        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-sm text-muted-foreground">Belum ada pengingat.</p>
        ) : (
          <ul>
            {notifications.map((item) => (
              <li key={item.id} className="border-b border-border/70 px-3 py-2.5 last:border-b-0">
                <p className="text-[13px] font-medium">{item.title}</p>
                <p className="mt-0.5 text-[13px] leading-5 text-muted-foreground">{item.body}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {formatDateTime(item.createdAt)}
                  {item.policy && (
                    <>
                      {" · "}
                      <Link href={`/policies/${item.policy.id}`} className="text-primary hover:underline">
                        {item.policy.documentNumber}
                      </Link>
                    </>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
