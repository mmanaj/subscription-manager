import assert from "node:assert/strict";
import { test } from "node:test";
import { chargesBetween, monthlyFactor, nextCharge } from "./billing";
import { en } from "./i18n/en";
import { pl } from "./i18n/pl";

const base = {
  intervalCount: 1,
  intervalUnit: "month" as const,
  startDate: "2026-01-31",
  firstBillingDate: null,
  trialEndDate: null,
  endDate: null,
  status: "active" as const,
};

test("monthly from the 31st clamps to month end but keeps anchor day", () => {
  assert.deepEqual(chargesBetween(base, "2026-01-01", "2026-05-31"), [
    "2026-01-31",
    "2026-02-28",
    "2026-03-31",
    "2026-04-30",
    "2026-05-31",
  ]);
});

test("next charge is today when due today", () => {
  assert.equal(nextCharge(base, "2026-03-31"), "2026-03-31");
  assert.equal(nextCharge(base, "2026-04-01"), "2026-04-30");
});

test("trial end becomes first charge", () => {
  const s = { ...base, startDate: "2026-10-01", trialEndDate: "2026-10-15" };
  assert.equal(nextCharge(s, "2026-10-05"), "2026-10-15");
  assert.deepEqual(chargesBetween(s, "2026-10-01", "2026-11-30"), ["2026-10-15", "2026-11-15"]);
});

test("end date stops renewals (exclusive)", () => {
  const s = { ...base, startDate: "2026-01-01", endDate: "2026-04-01" };
  assert.deepEqual(chargesBetween(s, "2026-01-01", "2026-12-31"), ["2026-01-01", "2026-02-01", "2026-03-01"]);
});

test("yearly and leap day", () => {
  const s = { ...base, intervalUnit: "year" as const, startDate: "2024-02-29" };
  assert.deepEqual(chargesBetween(s, "2024-01-01", "2028-12-31"), ["2024-02-29", "2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"]);
});

test("far range jump stays exact for weekly", () => {
  const s = { ...base, intervalUnit: "week" as const, startDate: "2020-01-06" };
  assert.equal(nextCharge(s, "2026-10-05"), "2026-10-05");
  assert.equal(nextCharge(s, "2026-10-06"), "2026-10-12");
});

test("paused/cancelled produce no charges", () => {
  assert.deepEqual(chargesBetween({ ...base, status: "paused" }, "2026-01-01", "2026-12-31"), []);
});

test("labels and factors", () => {
  assert.equal(pl.cycle("month", 3), "co kwartał");
  assert.equal(pl.cycle("week", 2), "co 2 tygodnie");
  assert.equal(pl.cycle("month", 5), "co 5 miesięcy");
  assert.equal(en.cycle("month", 3), "quarterly");
  assert.equal(en.cycle("week", 2), "every 2 weeks");
  assert.equal(en.cycle("year", 1), "yearly");
  assert.equal(monthlyFactor("year", 1), 1 / 12);
});

test("no start date: counts from the given payment date", () => {
  const s = { ...base, startDate: null, firstBillingDate: "2026-10-12" };
  assert.equal(nextCharge(s, "2026-10-05"), "2026-10-12");
  assert.deepEqual(chargesBetween(s, "2026-01-01", "2026-10-11", true), []);
});

test("start date + later payment date: charges counted back to start", () => {
  const s = { ...base, startDate: "2026-06-03", firstBillingDate: "2026-10-12" };
  assert.deepEqual(chargesBetween(s, "2000-01-01", "2026-10-31"), [
    "2026-06-12",
    "2026-07-12",
    "2026-08-12",
    "2026-09-12",
    "2026-10-12",
  ]);
});

test("no dates at all yields no charges", () => {
  assert.deepEqual(chargesBetween({ ...base, startDate: null }, "2026-01-01", "2026-12-31"), []);
});
