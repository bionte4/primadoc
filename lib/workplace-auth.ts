import type { OAuthConfig } from "next-auth/providers/oauth";
import type { Role } from "@prisma/client";

export const WORKPLACE_PROVIDERS = ["azure-ad", "google", "oidc"] as const;
export type WorkplaceProvider = (typeof WORKPLACE_PROVIDERS)[number];

type ClaimProfile = {
  email?: string | null;
  preferred_username?: string | null;
  upn?: string | null;
  unique_name?: string | null;
  oid?: string | null;
  sub?: string | null;
  name?: string | null;
  hd?: string | null;
  email_verified?: boolean | string | null;
};

export function isWorkplaceProvider(provider: string | undefined): provider is WorkplaceProvider {
  return WORKPLACE_PROVIDERS.some((id) => id === provider);
}

export function microsoftAuthConfig() {
  const clientId = process.env.AZURE_AD_CLIENT_ID?.trim();
  const clientSecret = process.env.AZURE_AD_CLIENT_SECRET?.trim();
  const tenantId = process.env.AZURE_AD_TENANT_ID?.trim();
  if (!clientId || !clientSecret || !tenantId) return null;
  return { clientId, clientSecret, tenantId };
}

export function googleAuthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const domain = process.env.GOOGLE_WORKSPACE_DOMAIN?.trim().toLowerCase();
  if (!clientId || !clientSecret || !domain) return null;
  return { clientId, clientSecret, domain };
}

export function directoryAuthConfig() {
  const issuer = process.env.OIDC_ISSUER?.trim().replace(/\/$/, "");
  const clientId = process.env.OIDC_CLIENT_ID?.trim();
  const clientSecret = process.env.OIDC_CLIENT_SECRET?.trim();
  if (!issuer || !clientId || !clientSecret) return null;
  const label = process.env.OIDC_LABEL?.trim() || "Active Directory";
  return { issuer, clientId, clientSecret, label };
}

export function workplaceEmail(profile: ClaimProfile | undefined, fallback?: string | null) {
  const value = profile?.email || profile?.preferred_username || profile?.upn || profile?.unique_name || fallback;
  const email = value?.trim().toLowerCase() ?? "";
  return email || null;
}

export function workplaceSubject(profile: ClaimProfile | undefined) {
  const value = profile?.oid || profile?.sub;
  return value?.trim() || null;
}

export function googleWorkspaceDecision(profile: ClaimProfile | undefined, domain: string) {
  const hosted = profile?.hd?.trim().toLowerCase() ?? "";
  if (!hosted || hosted !== domain) return "domain" as const;
  if (profile?.email_verified === false || profile?.email_verified === "false") return "unverified" as const;
  return "ok" as const;
}

export function directoryOidcProvider(config: NonNullable<ReturnType<typeof directoryAuthConfig>>): OAuthConfig<ClaimProfile> {
  return {
    id: "oidc",
    name: config.label,
    type: "oauth",
    wellKnown: `${config.issuer}/.well-known/openid-configuration`,
    issuer: config.issuer,
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    authorization: { params: { scope: "openid email profile" } },
    idToken: true,
    checks: ["pkce", "state"],
    client: { token_endpoint_auth_method: "client_secret_post" },
    profile(profile) {
      return {
        id: workplaceSubject(profile) ?? "",
        name: profile.name?.trim() || workplaceEmail(profile) || "Pengguna",
        email: workplaceEmail(profile) ?? "",
        image: null,
        role: "STAFF" satisfies Role,
      };
    },
  };
}

export function workplaceAccountLabel(account: {
  authProvider: string | null;
  entraId: string | null;
  password: string | null;
}) {
  if (account.authProvider === "google") return "Google Workspace";
  if (account.authProvider === "oidc") return "Active Directory";
  if (account.authProvider === "azure-ad" || account.entraId) return "Microsoft";
  if (account.password) return "Akun lokal";
  return "Belum masuk";
}

import type { Dictionary } from "@/lib/i18n/dictionary";

export function workplaceLoginError(code: string | undefined, t?: Dictionary) {
  if (code === "AccessDenied") {
    return t?.login.accessDenied ?? "Akun kantor ini belum diundang. Minta admin menambahkan email Anda di PrismaDoc.";
  }
  if (code === "WorkspaceDomain") {
    return t?.login.workspaceDomain ?? "Gunakan akun Google Workspace perusahaan, bukan akun Gmail pribadi.";
  }
  if (
    code === "OAuthSignin" ||
    code === "OAuthCallback" ||
    code === "Callback" ||
    code === "OAuthAccountNotLinked" ||
    code === "Configuration"
  ) {
    return t?.login.oauthFailed ?? "Masuk dengan akun kantor belum berhasil. Periksa pendaftaran aplikasi OpenID Connect.";
  }
  return null;
}
