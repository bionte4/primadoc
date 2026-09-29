import { FileText } from "lucide-react";
import { redirect } from "next/navigation";
import { LanguageSwitch } from "@/components/language-switch";
import { LoginForm } from "@/components/login-form";
import { auth } from "@/lib/auth";
import { fill, getDictionary } from "@/lib/i18n";
import {
  directoryAuthConfig,
  googleAuthConfig,
  microsoftAuthConfig,
  workplaceLoginError,
} from "@/lib/workplace-auth";
import { safeCallbackUrl } from "@/lib/session-cookie";
import { DEMO_PASSWORD } from "@/lib/constants";
import { showDemoAccounts } from "@/lib/demo-access";
import type { Role } from "@prisma/client";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const { t } = await getDictionary();
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  if (session?.user?.mustChangePassword) redirect("/settings/password");
  if (session?.user) redirect(callbackUrl);

  const showDemo = showDemoAccounts();
  const demoAccounts: { role: Role; email: string; name: string }[] = [
    { role: "STAFF", name: "Anita Putri", email: "staff@prismadoc.local" },
    { role: "REVIEWER", name: "Budi Santoso", email: "reviewer@prismadoc.local" },
    { role: "APPROVER", name: "Citra Wijaya", email: "approver@prismadoc.local" },
    { role: "ADMIN", name: "Dimas Hartono", email: "admin@prismadoc.local" },
  ];
  const directory = directoryAuthConfig();
  const workplaceProviders = [
    microsoftAuthConfig() ? { id: "azure-ad", label: t.login.microsoft } : null,
    googleAuthConfig() ? { id: "google", label: t.login.google } : null,
    directory ? { id: "oidc", label: fill(t.login.directory, { name: directory.label }) } : null,
  ].flatMap((provider) => (provider ? [provider] : []));

  return (
    <main className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <section className="hidden flex-col justify-between bg-sidebar px-12 py-10 text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <FileText className="size-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">PrismaDoc</span>
        </div>
        <div className="max-w-md">
          <p className="text-sm uppercase tracking-[0.18em] text-sidebar-primary">
            {t.login.cycle}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            {t.login.headline}
          </h1>
          <p className="mt-4 text-sm leading-6 text-sidebar-foreground/75">
            {t.login.lead}
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/60">{t.login.footer}</p>
      </section>
      <section className="flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">{t.login.title}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t.login.hint}
              </p>
            </div>
            <LanguageSwitch />
          </div>
          <LoginForm
            callbackUrl={callbackUrl}
            workplaceProviders={workplaceProviders}
            workplaceError={workplaceLoginError(params.error, t)}
            demoPassword={showDemo ? DEMO_PASSWORD : null}
            demoAccounts={showDemo ? demoAccounts : null}
          />
        </div>
      </section>
    </main>
  );
}
