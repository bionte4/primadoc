import { redirect } from "next/navigation";
import { AiIntegrationForm, SmtpIntegrationForm } from "@/components/settings/integration-forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getIntegrationView, type ConfigSource } from "@/lib/integrations";
import { canManageUsers } from "@/lib/rbac";
import { requireUser } from "@/lib/session";
import { getDictionary } from "@/lib/i18n";

const SOURCE_KEY = {
  database: "stored",
  server: "server",
  none: "unset",
} as const satisfies Record<ConfigSource, "stored" | "server" | "unset">;

export default async function SettingsIntegrationsPage() {
  const user = await requireUser();
  if (!canManageUsers(user.role)) redirect("/dashboard");
  const config = await getIntegrationView();
  const { t } = await getDictionary();

  return (
    <div className="flex w-full flex-col gap-3">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">{t.integrations.title}</h1>
        <p className="text-xs text-muted-foreground">{t.integrations.lead}</p>
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card size="sm" className="dark:bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              SMTP
              <Badge variant={config.smtp.source === "none" ? "outline" : "secondary"}>
                {t.integrations[SOURCE_KEY[config.smtp.source]]}
              </Badge>
            </CardTitle>
            <CardDescription>{t.integrations.smtpTest}</CardDescription>
          </CardHeader>
          <CardContent>
            <SmtpIntegrationForm {...config.smtp} />
          </CardContent>
        </Card>
        <Card size="sm" className="dark:bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              AI
              <Badge variant={config.ai.source === "none" ? "outline" : "secondary"}>
                {t.integrations[SOURCE_KEY[config.ai.source]]}
              </Badge>
            </CardTitle>
            <CardDescription>{t.integrations.aiTest}</CardDescription>
          </CardHeader>
          <CardContent>
            <AiIntegrationForm
              provider={config.ai.provider}
              model={config.ai.model}
              baseUrl={config.ai.baseUrl}
              keySet={config.ai.keySet}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
