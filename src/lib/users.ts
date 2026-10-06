import "server-only";
import { eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { cards, categories, pushSubscriptions, settings, subscriptions, users, type User } from "@/db/schema";
import { isOwnerEmail, randomToken, type GoogleProfile } from "./google";

const DEFAULT_CATEGORIES = [
  "Streaming",
  "Muzyka",
  "Oprogramowanie",
  "AI",
  "Chmura",
  "Gry",
  "Telefon i internet",
  "Sport",
  "Prasa",
  "Edukacja",
  "Ubezpieczenie",
  "Inne",
];

/** Finds the account by Google id (refreshing name/email/photo) or creates it with starter categories. */
export async function signInUser(profile: GoogleProfile): Promise<User> {
  const fields = { email: profile.email, name: profile.name, picture: profile.picture, lastLoginAt: new Date() };
  const [existing] = await db.update(users).set(fields).where(eq(users.googleSub, profile.sub)).returning();
  const user =
    existing ??
    (await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(users)
        .values({ googleSub: profile.sub, icsToken: randomToken(24), ...fields })
        .returning();
      await tx.insert(categories).values(DEFAULT_CATEGORIES.map((name) => ({ userId: created.id, name })));
      return created;
    }));
  if (isOwnerEmail(user.email)) await claimLegacyData(user);
  return user;
}

/**
 * Hands rows from the single-user era (user_id null) to the owner. Idempotent — after the first
 * run there is nothing left to claim. The old ICS_TOKEN keeps working as the owner's feed URL.
 */
async function claimLegacyData(user: User) {
  await db.transaction(async (tx) => {
    const claimed = await tx.update(subscriptions).set({ userId: user.id }).where(isNull(subscriptions.userId)).returning({ id: subscriptions.id });
    await tx.update(cards).set({ userId: user.id }).where(isNull(cards.userId));
    await tx.update(pushSubscriptions).set({ userId: user.id }).where(isNull(pushSubscriptions.userId));
    // Old category list replaces the starter one only if there was legacy data at all.
    const legacyCats = await tx.select({ name: categories.name }).from(categories).where(isNull(categories.userId));
    if (legacyCats.length) {
      await tx.delete(categories).where(eq(categories.userId, user.id));
      await tx.update(categories).set({ userId: user.id }).where(isNull(categories.userId));
    }
    const [old] = await tx.select().from(settings);
    if (old) {
      await tx.update(users).set({ remindDaysBefore: old.remindDaysBefore, remindSameDay: old.remindSameDay }).where(eq(users.id, user.id));
      await tx.delete(settings);
    }
    const legacyToken = process.env.ICS_TOKEN?.trim();
    if (claimed.length && legacyToken) {
      const [taken] = await tx.select({ id: users.id }).from(users).where(eq(users.icsToken, legacyToken));
      if (!taken) await tx.update(users).set({ icsToken: legacyToken }).where(eq(users.id, user.id));
    }
  });
}

/** Removes the account; FK cascades take every subscription, card, category and device with it. */
export async function deleteUser(id: number) {
  await db.delete(users).where(eq(users.id, id));
}

export async function rotateIcsToken(id: number) {
  await db.update(users).set({ icsToken: randomToken(24) }).where(eq(users.id, id));
}
