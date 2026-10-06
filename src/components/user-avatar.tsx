import type { User } from "@/db/schema";

/** Google profile photo, or the first letter of the name when there isn't one. */
export function UserAvatar({ user, size = 44 }: { user: Pick<User, "name" | "email" | "picture">; size?: number }) {
  const label = user.name || user.email;
  if (user.picture) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote Google avatar, tiny, no optimisation needed
      <img
        src={user.picture}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        className="shrink-0 rounded-full bg-canvas object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-ink font-medium text-paper"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {label.slice(0, 1).toUpperCase()}
    </span>
  );
}
