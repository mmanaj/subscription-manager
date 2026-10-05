import assert from "node:assert/strict";
import { test } from "node:test";
import { guessDomain, knownDomain, logoDomainFor, normalizeDomain } from "./logo-domains";

test("known services by name", () => {
  assert.equal(knownDomain("SkyShowtime"), "skyshowtime.com");
  assert.equal(knownDomain("Allegro Smart!"), "allegro.pl");
  assert.equal(knownDomain("Amazon Prime"), "amazon.pl");
  assert.equal(knownDomain("Amazon Prime Video"), "primevideo.com");
  assert.equal(knownDomain("Claude Pro"), "claude.ai");
  assert.equal(knownDomain("PlayStation Plus"), "playstation.com");
  assert.equal(knownDomain("Display"), null);
});

test("priority: manual > known > url > guess", () => {
  assert.equal(logoDomainFor({ name: "Netflix", url: null, logoDomain: "example.org" }), "example.org");
  assert.equal(logoDomainFor({ name: "Netflix", url: "https://help.other.com/x" }), "netflix.com");
  assert.equal(logoDomainFor({ name: "Foo Bar", url: "https://www.foo.io/account" }), "foo.io");
  assert.equal(logoDomainFor({ name: "Łódź Kino", url: null }), "lodz.com");
  assert.equal(guessDomain("x"), null);
});

test("normalize user-typed domains", () => {
  assert.equal(normalizeDomain(" https://www.SkyShowtime.com/pl "), "skyshowtime.com");
  assert.equal(normalizeDomain("allegro.pl"), "allegro.pl");
  assert.equal(normalizeDomain("not a domain"), null);
});
