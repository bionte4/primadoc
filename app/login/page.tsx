import { FileText } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { auth } from "@/lib/auth";
import {
  directoryAuthConfig,
  googleAuthConfig,
  microsoftAuthConfig,
  workplaceLoginError,
} from "@/lib/workplace-auth";
import { safeCallbackUrl } from "@/lib/session-cookie";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  if (session?.user) redirect(callbackUrl);

  const directory = directoryAuthConfig();
  const workplaceProviders = [
    microsoftAuthConfig() ? { id: "azure-ad", label: "Masuk dengan Microsoft" } : null,
    googleAuthConfig() ? { id: "google", label: "Masuk dengan Google Workspace" } : null,
    directory ? { id: "oidc", label: `Masuk dengan ${directory.label}` } : null,
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
            Siklus dokumen
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight">
            Draf, review, dan persetujuan dalam satu alur.
          </h1>
          <p className="mt-4 text-sm leading-6 text-sidebar-foreground/75">
            Setiap pengajuan dan keputusan tercatat di riwayat workflow serta audit log,
            lengkap dengan versi dokumen.
          </p>
        </div>
        <p className="text-xs text-sidebar-foreground/60">Kebijakan internal perusahaan</p>
      </section>
      <section className="flex items-center justify-center px-5 py-8">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-semibold tracking-tight">Masuk</h2>
          <p className="mt-0.5 mb-4 text-xs text-muted-foreground">
            Gunakan akun sesuai peran Anda.
          </p>
          <LoginForm
            callbackUrl={callbackUrl}
            workplaceProviders={workplaceProviders}
            workplaceError={workplaceLoginError(params.error)}
          />
        </div>
      </section>
    </main>
  );
}
