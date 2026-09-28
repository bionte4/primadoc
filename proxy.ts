import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { canAccessApprovalQueue, canCreatePolicy, canManageUsers } from "@/lib/rbac";
import { sessionCookieName } from "@/lib/session-cookie";

const LEGACY_SESSION_COOKIES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = await readSession(request);
  const role = token?.role;

  if (isProtected(pathname) && !role) {
    if (pathname.startsWith("/api/")) {
      return clearLegacyCookies(
        NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
        request,
      );
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
    return clearLegacyCookies(NextResponse.redirect(login), request);
  }

  if (role && !roleAllowed(pathname, role)) {
    return clearLegacyCookies(
      NextResponse.redirect(new URL("/policies", request.url)),
      request,
    );
  }

  return clearLegacyCookies(NextResponse.next(), request);
}

async function readSession(request: NextRequest) {
  if (!isProtected(request.nextUrl.pathname) && !request.nextUrl.pathname.startsWith("/api/files")) {
    return null;
  }

  return getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: sessionCookieName,
    secureCookie: sessionCookieName.startsWith("__Secure-"),
  });
}

function isProtected(pathname: string) {
  return (
    pathname === "/dashboard" ||
    pathname.startsWith("/policies") ||
    pathname === "/notifications" ||
    pathname.startsWith("/notifications/") ||
    pathname === "/approval" ||
    pathname.startsWith("/approval/") ||
    pathname === "/users" ||
    pathname.startsWith("/users/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/files")
  );
}

function roleAllowed(pathname: string, role: Role) {
  if (pathname === "/policies/new" || /^\/policies\/[^/]+\/edit$/.test(pathname)) {
    return canCreatePolicy(role);
  }
  if (pathname === "/approval" || pathname.startsWith("/approval/")) {
    return canAccessApprovalQueue(role);
  }
  if (pathname === "/users" || pathname.startsWith("/users/")) {
    return canManageUsers(role);
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return canManageUsers(role);
  }
  return true;
}

function clearLegacyCookies(response: NextResponse, request: NextRequest) {
  for (const cookie of request.cookies.getAll()) {
    const legacy = LEGACY_SESSION_COOKIES.some(
      (name) => cookie.name === name || cookie.name.startsWith(`${name}.`),
    );
    if (legacy) {
      response.cookies.set(cookie.name, "", { path: "/", maxAge: 0 });
    }
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
