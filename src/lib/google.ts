import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const jwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export type GoogleProfile = { sub: string; email: string; name: string | null; picture: string | null };

function client() {
  const id = process.env.GOOGLE_CLIENT_ID?.trim();
  const secret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!id || !secret) throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET not set");
  return { id, secret };
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
}

/** Must match an "Authorized redirect URI" in Google Cloud Console exactly. */
export function redirectUri(requestOrigin: string) {
  const base = process.env.APP_URL?.trim().replace(/\/+$/, "") || requestOrigin;
  return `${base}/api/auth/google/callback`;
}

export function authorizationUrl(opts: { redirectUri: string; state: string; verifier: string; nonce: string }) {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: client().id,
    redirect_uri: opts.redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state: opts.state,
    nonce: opts.nonce,
    code_challenge: createHash("sha256").update(opts.verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

/** Trades the one-time code for an ID token and verifies it (signature, issuer, audience, nonce). */
export async function exchangeCode(opts: { code: string; redirectUri: string; verifier: string; nonce: string }): Promise<GoogleProfile> {
  const { id, secret } = client();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: opts.code,
      client_id: id,
      client_secret: secret,
      redirect_uri: opts.redirectUri,
      grant_type: "authorization_code",
      code_verifier: opts.verifier,
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Google token exchange failed: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error("Google returned no id_token");

  const { payload } = await jwtVerify(id_token, jwks, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: id,
  });
  if (payload.nonce !== opts.nonce) throw new Error("Nonce mismatch");
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") throw new Error("ID token without sub/email");
  if (payload.email_verified !== true) throw new Error("Email not verified");
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    name: typeof payload.name === "string" ? payload.name : null,
    picture: typeof payload.picture === "string" ? payload.picture : null,
  };
}

function emailList(raw: string | undefined) {
  return (raw ?? "")
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** ALLOWED_EMAILS empty = anyone with a Google account may sign up. OWNER_EMAIL is always allowed. */
export function emailAllowed(email: string) {
  const allowed = emailList(process.env.ALLOWED_EMAILS);
  return !allowed.length || allowed.includes(email) || isOwnerEmail(email);
}

export function isOwnerEmail(email: string) {
  return emailList(process.env.OWNER_EMAIL).includes(email);
}
