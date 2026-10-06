import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeSubject } from "./push-subject";

test("VAPID subject normalisation", () => {
  assert.equal(normalizeSubject("mailto:mailto:manaj.m@gmail.com"), "mailto:manaj.m@gmail.com");
  assert.equal(normalizeSubject(" mailto: me@x.pl \n"), "mailto:me@x.pl");
  assert.equal(normalizeSubject("me@x.pl"), "mailto:me@x.pl");
  assert.equal(normalizeSubject("https://subs.example.com"), "https://subs.example.com");
  assert.equal(normalizeSubject(""), "mailto:owner@example.com");
});
