import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyBrokenLink,
  classifyJavaScriptError,
  classifyResponse,
} from "./classifier";

test("classifies a failed target page more severely than a failed resource", () => {
  assert.deepEqual(
    classifyResponse({ status: 503, resourceType: "document", isTargetPage: true }),
    { category: "network", severity: "critical", confidence: "high" }
  );
  assert.deepEqual(
    classifyResponse({ status: 503, resourceType: "fetch", isTargetPage: false }),
    { category: "network", severity: "high", confidence: "high" }
  );
});

test("assigns lower severity to broken visual resources", () => {
  assert.deepEqual(
    classifyResponse({ status: 404, resourceType: "image", isTargetPage: false }),
    { category: "broken_resource", severity: "low", confidence: "high" }
  );
});

test("does not report expected protected or rate-limited link responses", () => {
  for (const status of [401, 403, 429]) {
    assert.equal(classifyBrokenLink(status), null);
  }
});

test("classifies client and server failures for internal links", () => {
  assert.deepEqual(classifyBrokenLink(404), {
    category: "broken_link",
    severity: "medium",
    confidence: "high",
  });
  assert.deepEqual(classifyBrokenLink(500), {
    category: "broken_link",
    severity: "high",
    confidence: "high",
  });
  assert.equal(classifyBrokenLink(302), null);
});

test("classifies unhandled JavaScript errors", () => {
  assert.deepEqual(classifyJavaScriptError(), {
    category: "javascript",
    severity: "high",
    confidence: "high",
  });
});