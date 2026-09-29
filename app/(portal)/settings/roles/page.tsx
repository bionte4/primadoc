import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { canManageUsers } from "@/lib/rbac";
import { getDictionary } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import type { Role } from "@prisma/client";

const ORDER: Role[] = ["ADMIN", "APPROVER", "REVIEWER", "STAFF"];

export default async function SettingsRolesPage() {
  const user = await requireUser();
  if (!canManageUsers(user.role)) redirect("/dashboard");
  const { t } = await getDictionary();

  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t.rolesPage.title}</h1>
        <p className="text-xs text-muted-foreground">{t.rolesPage.lead}</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {ORDER.map((role) => (
          <Card key={role} size="sm" className="dark:bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {t.role[role]}
                <Badge variant="outline">{role}</Badge>
              </CardTitle>
              <CardDescription>{t.rolesPage[role].summary}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                {t.rolesPage[role].points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
