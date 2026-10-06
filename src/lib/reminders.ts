import type { Subscription } from "@/db/schema";
import { chargesBetween } from "./billing";
import { addDays, type ISODate } from "./dates";

export type ReminderKind = "before" | "day";
export type DueReminder = { subId: number; chargeDate: ISODate; kind: ReminderKind };

type Fields = Pick<
  Subscription,
  "id" | "notify" | "status" | "intervalCount" | "intervalUnit" | "startDate" | "firstBillingDate" | "trialEndDate" | "endDate"
>;

/**
 * Reminders due today for subscriptions that opted in: one `daysBefore` ahead of a charge and,
 * optionally, one on the day itself.
 */
export function dueReminders(
  subs: Fields[],
  today: ISODate,
  opts: { daysBefore: number; sameDay: boolean },
): DueReminder[] {
  const out: DueReminder[] = [];
  for (const s of subs) {
    if (!s.notify || s.status !== "active") continue;
    if (opts.daysBefore > 0) {
      const target = addDays(today, opts.daysBefore);
      if (chargesBetween(s, target, target).length) out.push({ subId: s.id, chargeDate: target, kind: "before" });
    }
    if (opts.sameDay && chargesBetween(s, today, today).length) out.push({ subId: s.id, chargeDate: today, kind: "day" });
  }
  return out;
}
