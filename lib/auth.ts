import type { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { findInvitedUser } from "@/lib/invited-user";
import {
  directoryAuthConfig,
  directoryOidcProvider,
  googleAuthConfig,
  googleWorkspaceDecision,
  isWorkplaceProvider,
  microsoftAuthConfig,
  workplaceEmail,
  workplaceSubject,
} from "@/lib/workplace-auth";
import { sessionCookieName } from "@/lib/session-cookie";

const useSecureCookies = sessionCookieName.startsWith("__Secure-");
const microsoft = microsoftAuthConfig();
const google = googleAuthConfig();
const directory = directoryAuthConfig();

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  // A dedicated cookie name avoids decrypting leftover next-auth cookies from other apps on localhost.
  cookies: {
    sessionToken: {
      name: sessionCookieName,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: useSecureCookies,
      },
    },
  },
  logger: {
    error(code, metadata) {
      if (code === "JWT_SESSION_ERROR") return;
      console.error(`[next-auth][${code}]`, metadata);
    },
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase() ?? "";
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const user = await findInvitedUser(email);
        if (!user?.password) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
    ...(microsoft
      ? [
          AzureADProvider({
            clientId: microsoft.clientId,
            clientSecret: microsoft.clientSecret,
            tenantId: microsoft.tenantId,
            profile(profile) {
              return {
                id: profile.oid ?? profile.sub,
                name: profile.name,
                email: workplaceEmail(profile),
                image: null,
                // Replaced from the invited User row before the session is issued.
                role: "STAFF" as const,
              };
            },
          }),
        ]
      : []),
    ...(google
      ? [
          GoogleProvider({
            clientId: google.clientId,
            clientSecret: google.clientSecret,
            authorization: {
              params: {
                prompt: "select_account",
                hd: google.domain,
              },
            },
            profile(profile) {
              return {
                id: profile.sub,
                name: profile.name,
                email: workplaceEmail(profile),
                image: null,
                role: "STAFF" as const,
              };
            },
          }),
        ]
      : []),
    ...(directory ? [directoryOidcProvider(directory)] : []),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!isWorkplaceProvider(account?.provider)) return true;

      if (account.provider === "google" && google) {
        const decision = googleWorkspaceDecision(profile, google.domain);
        if (decision === "domain") return "/login?error=WorkspaceDomain";
        if (decision === "unverified") return "/login?error=AccessDenied";
      }

      const email = workplaceEmail(profile, user.email);
      const invited = email ? await findInvitedUser(email) : null;
      if (!invited) return "/login?error=AccessDenied";

      const subject = workplaceSubject(profile);
      const link = {
        authProvider: account.provider,
        ...(subject ? { externalId: subject } : {}),
        ...(account.provider === "azure-ad" && subject ? { entraId: subject } : {}),
      };
      const changed =
        invited.authProvider !== link.authProvider ||
        (subject != null && invited.externalId !== subject) ||
        (account.provider === "azure-ad" && subject != null && invited.entraId !== subject);
      if (changed) {
        await prisma.user.update({ where: { id: invited.id }, data: link });
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (isWorkplaceProvider(account?.provider)) {
        const invited = user?.email ? await findInvitedUser(user.email) : null;
        if (!invited) return token;
        token.id = invited.id;
        token.role = invited.role;
        token.email = invited.email;
        token.name = invited.name;
        return token;
      }
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
};

export async function auth() {
  const cookieStore = await cookies();
  const session = await getServerSession(authOptions);

  if (session?.user) return session;

  const staleSession = cookieStore
    .getAll()
    .some((cookie) => cookie.name.startsWith(sessionCookieName));

  if (staleSession) redirect("/api/auth/clear-session");

  return null;
}
