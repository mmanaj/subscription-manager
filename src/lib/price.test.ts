import assert from "node:assert/strict";
import { test } from "node:test";
import { amountOn, latestAmount, pctChange } from "./price";

const events = [
  { effectiveDate: "2025-03-01", oldAmount: 43, newAmount: 49 },
  { effectiveDate: "2026-12-01", oldAmount: 49, newAmount: 55 },
];

test("price in force on a date", () => {
  assert.equal(amountOn(55, events, "2024-12-01"), 43);
  assert.equal(amountOn(55, events, "2025-03-01"), 49);
  assert.equal(amountOn(55, events, "2026-10-05"), 49);
  assert.equal(amountOn(55, events, "2026-12-01"), 55);
});

test("no history uses current amount", () => {
  assert.equal(amountOn(30, [], "2020-01-01"), 30);
  assert.equal(latestAmount(30, []), 30);
});

test("latest and pct", () => {
  assert.equal(latestAmount(0, events), 55);
  assert.equal(Math.round(pctChange(43, 55)), 28);
});
