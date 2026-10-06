import { NextResponse, type NextRequest } from "next/server";
import { emailAllowed, exchangeCode, redirectUri } from "@/lib/google";
import { cookieOptions, OAUTH_COOKIE, SESSION_COOKIE, SESSION_DAYS, signSession, verifyOAuthFlow } from "@/lib/session";
import { signInUser } from "@/lib/users";

export const dynamic = "force-dynamic";

/** Step 2: Google sends the browser back with a one-time code; verify it and start a session. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const flow = await verifyOAuthFlow(req.cookies.get(OAUTH_COOKIE)?.value);
  const fail = (error: string) => {
    const res = NextResponse.redirect(new URL(`/login?error=${error}`, req.url));
    res.cookies.delete(OAUTH_COOKIE);
    return res;
  };

  if (params.get("error")) return fail("cancelled");
  const code = params.get("code");
  if (!flow || !code || params.get("state") !== flow.state) return fail("state");

  let userId: number;
  try {
    const profile = await exchangeCode({ code, redirectUri: redirectUri(req.nextUrl.origin), verifier: flow.verifier, nonce: flow.nonce });
    if (!emailAllowed(profile.email)) return fail("not_allowed");
    userId = (await signInUser(profile)).id;
  } catch (e) {
    console.error("google sign-in failed", e);
    return fail("google");
  }

  const res = NextResponse.redirect(new URL(flow.next, req.url));
  res.cookies.delete(OAUTH_COOKIE);
  res.cookies.set(SESSION_COOKIE, await signSession(userId), cookieOptions(SESSION_DAYS * 86400));
  return res;
}
