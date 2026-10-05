import assert from "node:assert/strict";
import { test } from "node:test";
import { detectBrand, formatExpiryInput, parseExpiry } from "./card-brand";

test("detects networks from leading digits", () => {
  assert.equal(detectBrand("4111111111111111"), "Visa");
  assert.equal(detectBrand("5500000000000004"), "Mastercard");
  assert.equal(detectBrand("2223000048400011"), "Mastercard");
  assert.equal(detectBrand("378282246310005"), "Amex");
  assert.equal(detectBrand("6011000000000004"), null);
});

test("expiry parsing and formatting", () => {
  assert.deepEqual(parseExpiry("12/28"), { month: 12, year: 2028 });
  assert.deepEqual(parseExpiry("03 / 2030"), { month: 3, year: 2030 });
  assert.equal(parseExpiry("13/28"), null);
  assert.equal(parseExpiry("1"), null);
  assert.equal(formatExpiryInput("1228"), "12/28");
  assert.equal(formatExpiryInput("12/2"), "12/2");
});
