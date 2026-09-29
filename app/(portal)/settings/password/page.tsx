import Link from "next/link";
import { PasswordForm } from "@/components/settings/password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getDictionary } from "@/lib/i18n";
import { requireUser } from "@/lib/session";

export default async function PasswordPage() {
  const user = await requireUser();
  const { t } = await getDictionary();
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { email: true, password: true, mustChangePassword: true },
  });
  const hasPassword = Boolean(account?.password);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t.settings.passwordTitle}</h1>
        <p className="text-xs text-muted-foreground">{t.settings.passwordLead}</p>
      </div>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{t.settings.changePassword}</CardTitle>
          <CardDescription>
            {account?.mustChangePassword ? t.settings.mustChange : t.settings.passwordLead}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasPassword && account ? (
            <PasswordForm email={account.email} />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t.settings.workplacePassword}</p>
              <Link href="/settings" className="text-sm font-medium text-primary hover:underline">
                {t.settings.profile}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
