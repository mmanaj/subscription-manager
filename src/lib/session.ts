import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "subs_session";
export const SESSION_DAYS = 90;

export const cookieOptions = (maxAgeSeconds: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: maxAgeSeconds,
});

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("AUTH_SECRET must be set (min. 32 chars)");
  return new TextEncoder().encode(secret);
}

export async function signSession(userId: number): Promise<string> {
  return new SignJWT({ sub: String(userId) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key());
}

/** The signed-in user's id, or null. Sessions from the password era (sub "owner") no longer count. */
export async function verifySession(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    return Number.isInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

/** Short-lived values carried through the Google redirect (CSRF state, PKCE verifier, nonce). */
export const OAUTH_COOKIE = "subs_oauth";

export type OAuthFlow = { state: string; verifier: string; nonce: string; next: string };

export async function signOAuthFlow(flow: OAuthFlow): Promise<string> {
  return new SignJWT(flow).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("10m").sign(key());
}

export async function verifyOAuthFlow(token: string | undefined): Promise<OAuthFlow | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<OAuthFlow>(token, key(), { algorithms: ["HS256"] });
    return payload;
  } catch {
    return null;
  }
}
