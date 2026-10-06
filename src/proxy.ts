import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const userId = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (userId) return NextResponse.next();
  const url = new URL("/login", request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/" && !pathname.startsWith("/api/")) url.searchParams.set("next", pathname + search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    // Everything except login, Google sign-in, the token-protected calendar feed, cron, PWA/static assets
    "/((?!login|api/auth|api/calendar|api/cron|sw.js|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest).*)",
  ],
};
