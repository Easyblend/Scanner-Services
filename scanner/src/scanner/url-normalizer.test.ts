import assert from "node:assert/strict";
import test from "node:test";
import { normalizeUrl } from "./url-normalizer";

const startUrl = new URL("https://example.com/");

test("normalizes same-origin URLs and removes fragments and trailing slashes", () => {
  assert.equal(
    normalizeUrl("https://example.com/about/?view=full#team", startUrl),
    "https://example.com/about?view=full"
  );
});

test("keeps the root path slash", () => {
  assert.equal(normalizeUrl("https://example.com/#top", startUrl), "https://example.com/");
});

test("rejects external, invalid, and non-page resource URLs", () => {
  assert.equal(normalizeUrl("https://other.example/about", startUrl), null);
  assert.equal(normalizeUrl("not a URL", startUrl), null);
  assert.equal(normalizeUrl("https://example.com/image.PNG", startUrl), null);
});