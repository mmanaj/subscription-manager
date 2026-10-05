import { eq } from "drizzle-orm";
import { db } from "@/db";
import { logos } from "@/db/schema";

export async function GET(_req: Request, ctx: RouteContext<"/api/logo/[id]">) {
  const id = Number((await ctx.params).id);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });
  const [logo] = await db.select().from(logos).where(eq(logos.subscriptionId, id));
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
