import { NextResponse, type NextRequest } from "next/server";
import { authorizationUrl, randomToken, redirectUri } from "@/lib/google";
import { cookieOptions, OAUTH_COOKIE, signOAuthFlow } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Only same-site paths, so the login can't be used as an open redirect. */
function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\") ? raw : "/";
}

/** Step 1: send the browser to Google's account picker. */
export async function GET(req: NextRequest) {
  const flow = { state: randomToken(), verifier: randomToken(48), nonce: randomToken(), next: safeNext(req.nextUrl.searchParams.get("next")) };
  let url: string;
  try {
    url = authorizationUrl({ redirectUri: redirectUri(req.nextUrl.origin), ...flow });
  } catch {
    return NextResponse.redirect(new URL("/login?error=config", req.url));
  }
  const res = NextResponse.redirect(url);
  res.cookies.set(OAUTH_COOKIE, await signOAuthFlow(flow), cookieOptions(600));
  return res;
}
