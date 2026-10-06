import "server-only";
import { eq, sql } from "drizzle-orm";
import webpush from "web-push";
import { db } from "@/db";
import { pushSubscriptions } from "@/db/schema";
import { cleanEnv as clean, normalizeSubject } from "./push-subject";

export type PushPayload = { title: string; body: string; url?: string; tag?: string };
export type DeviceResult = { id: number; label: string | null; ok: boolean; status?: number; detail?: string };

function vapid() {
  const publicKey = clean(process.env.VAPID_PUBLIC_KEY);
  const privateKey = clean(process.env.VAPID_PRIVATE_KEY);
  return { publicKey, privateKey, subject: normalizeSubject(process.env.VAPID_SUBJECT) };
}

export function publicVapidKey() {
  return vapid().publicKey;
}

export function pushConfigured() {
  const v = vapid();
  return !!(v.publicKey && v.privateKey);
}

/** What's set up and what isn't — shown in the notification centre to make failures explainable. */
export function pushDiagnostics() {
  const v = vapid();
  let keysValid = false;
  let keysError: string | undefined;
  try {
    webpush.setVapidDetails(v.subject, v.publicKey, v.privateKey);
    keysValid = true;
  } catch (e) {
    keysError = (e as Error).message;
  }
  return {
    publicKey: !!v.publicKey,
    privateKey: !!v.privateKey,
    subject: v.subject,
    keysValid,
    keysError,
    cronSecret: !!clean(process.env.CRON_SECRET),
  };
}

/** Sends to every device of one user; prunes devices the push service says are gone. */
export async function sendToUser(userId: number, payload: PushPayload): Promise<{ sent: number; failed: number; results: DeviceResult[] }> {
  if (!pushConfigured()) return { sent: 0, failed: 0, results: [] };
  const v = vapid();
  webpush.setVapidDetails(v.subject, v.publicKey, v.privateKey);
  const devices = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  const results = await Promise.all(
    devices.map(async (d): Promise<DeviceResult> => {
      try {
        await webpush.sendNotification(
          { endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24, urgency: "high" },
        );
        await db.update(pushSubscriptions).set({ lastSentAt: sql`now()` }).where(eq(pushSubscriptions.id, d.id));
        return { id: d.id, label: d.label, ok: true };
      } catch (e) {
        const err = e as { statusCode?: number; body?: string; message?: string };
        if (err.statusCode === 404 || err.statusCode === 410) {
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, d.id));
        }
        console.error("push failed", d.label, err.statusCode, err.body ?? err.message);
        return { id: d.id, label: d.label, ok: false, status: err.statusCode, detail: (err.body || err.message || "").slice(0, 200) };
      }
    }),
  );
  const sent = results.filter((r) => r.ok).length;
  return { sent, failed: results.length - sent, results };
}
