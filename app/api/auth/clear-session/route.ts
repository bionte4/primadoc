import { NextResponse } from "next/server";

const SESSION_COOKIES = [
  "prismadoc-session-token",
  "__Secure-prismadoc-session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  const header = request.headers.get("cookie") ?? "";

  for (const part of header.split(";")) {
    const name = part.split("=")[0]?.trim();
    if (!name) continue;
    if (SESSION_COOKIES.some((cookie) => name === cookie || name.startsWith(`${cookie}.`))) {
      response.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
  }

  return response;
}
