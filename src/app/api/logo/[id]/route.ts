import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { logos, subscriptions } from "@/db/schema";
import { currentUser } from "@/lib/auth";

export async function GET(_req: Request, ctx: RouteContext<"/api/logo/[id]">) {
  const id = Number((await ctx.params).id);
  const user = await currentUser();
  if (!user || !Number.isInteger(id)) return new Response("Not found", { status: 404 });
  const [row] = await db
    .select({ logo: logos })
    .from(logos)
    .innerJoin(subscriptions, eq(subscriptions.id, logos.subscriptionId))
    .where(and(eq(logos.subscriptionId, id), eq(subscriptions.userId, user.id)));
  const logo = row?.logo;
  if (!logo) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(logo.data, "base64"), {
    headers: {
      "Content-Type": logo.contentType,
      // URL carries ?v=<version>, so it can be cached forever.
      "Cache-Control": "private, max-age=31536000, immutable",
      // Third-party SVGs must never run script if opened directly.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; sandbox",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
