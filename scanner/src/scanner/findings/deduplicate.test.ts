import assert from "node:assert/strict";
import test from "node:test";
import { deduplicateFindings } from "./deduplicate";
import type { Finding } from "./finding";

function makeFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    category: "network",
    severity: "high",
    confidence: "high",
    url: "https://example.com/page",
    description: "Request failed.",
    evidence: { request: "https://example.com/api", statusCode: 500 },
    ...overrides,
  };
}

test("removes duplicate findings and keeps the first occurrence", () => {
  const first = makeFinding();
  const duplicate = makeFinding({ description: "Duplicate report." });

  assert.deepEqual(deduplicateFindings([first, duplicate]), [first]);
});

test("keeps findings with different identifying evidence", () => {
  const first = makeFinding();
  const distinct = makeFinding({ evidence: { request: "https://example.com/other", statusCode: 500 } });

  assert.deepEqual(deduplicateFindings([first, distinct]), [first, distinct]);
});

test("returns an empty list for no findings", () => {
  assert.deepEqual(deduplicateFindings([]), []);
});