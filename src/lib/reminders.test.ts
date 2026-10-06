import assert from "node:assert/strict";
import { test } from "node:test";
import { dueReminders } from "./reminders";

const sub = {
  id: 1,
  notify: true,
  status: "active" as const,
  intervalCount: 1,
  intervalUnit: "month" as const,
  startDate: null,
  firstBillingDate: "2026-10-18",
  trialEndDate: null,
  endDate: null,
};
const opts = { daysBefore: 3, sameDay: true };

test("3 days before and on the day", () => {
  assert.deepEqual(dueReminders([sub], "2026-10-15", opts), [{ subId: 1, chargeDate: "2026-10-18", kind: "before" }]);
  assert.deepEqual(dueReminders([sub], "2026-10-18", opts), [{ subId: 1, chargeDate: "2026-10-18", kind: "day" }]);
  assert.deepEqual(dueReminders([sub], "2026-10-16", opts), []);
  assert.deepEqual(dueReminders([sub], "2026-11-15", opts), [{ subId: 1, chargeDate: "2026-11-18", kind: "before" }]);
});

test("opted-out, paused or same-day disabled", () => {
  assert.deepEqual(dueReminders([{ ...sub, notify: false }], "2026-10-15", opts), []);
  assert.deepEqual(dueReminders([{ ...sub, status: "paused" }], "2026-10-15", opts), []);
  assert.deepEqual(dueReminders([sub], "2026-10-18", { daysBefore: 3, sameDay: false }), []);
});
