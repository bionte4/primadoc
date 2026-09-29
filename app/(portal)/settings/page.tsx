import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getDictionary } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import Link from "next/link";

export default async function SettingsPage() {
  const user = await requireUser();
  const { t } = await getDictionary();
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  });

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t.settings.title}</h1>
        <p className="text-xs text-muted-foreground">{t.settings.lead}</p>
      </div>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t.settings.profileTitle}</CardTitle>
          <CardDescription>{t.settings.profileLead}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-[7rem_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">{t.settings.name}</dt>
            <dd>{user.name}</dd>
            <dt className="text-muted-foreground">{t.settings.email}</dt>
            <dd className="truncate">{user.email}</dd>
            <dt className="text-muted-foreground">{t.settings.role}</dt>
            <dd>
              <Badge variant="secondary">{t.role[user.role]}</Badge>
            </dd>
          </dl>
          {account?.password ? (
            <p className="mt-3">
              <Link href="/settings/password" className="text-sm font-medium text-primary hover:underline">
                {t.settings.changePassword}
              </Link>
            </p>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">{t.settings.workplacePassword}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
