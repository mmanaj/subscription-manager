import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "./session";

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user, looked up once per request; null when signed out or the account is gone. */
export const currentUser = cache(async (): Promise<User | null> => {
  const id = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!id) return null;
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user ?? null;
});

/** Every page, action and route that touches data goes through this — proxy only checks the cookie. */
export async function requireUser(): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  return user;
}
