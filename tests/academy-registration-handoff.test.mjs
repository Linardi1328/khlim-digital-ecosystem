import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const handoffUrl = new URL(
  "../docs/implementation/ric-191-academy-registration-handoff.md",
  import.meta.url,
);

function jsonBlocks(markdown) {
  return [...markdown.matchAll(/```json\n([\s\S]*?)```/g)].map(
    (match) => match[1],
  );
}

test("RIC-191 handoff mock fixtures are complete, parseable JSON", async () => {
  const markdown = await readFile(handoffUrl, "utf8");
  const blocks = jsonBlocks(markdown);
  assert.ok(
    blocks.length >= 5,
    "the handoff publishes request/response fixtures",
  );
  for (const [index, block] of blocks.entries()) {
    assert.doesNotThrow(() => JSON.parse(block), `json block ${index + 1}`);
    assert.ok(
      !block.includes("{…}"),
      `json block ${index + 1} has placeholders`,
    );
  }
});

// Every status/code pair the handoff documents for mocks; a fixture with a
// plausible code but the wrong status, or a missing fixture, fails.
const REQUIRED_ERROR_FIXTURES = [
  [409, "SESSION_FULL"],
  [409, "CONSENT_VERSION_MISMATCH"],
  [422, "PLAYER_AGE_INELIGIBLE"],
  [429, "RATE_LIMITED"],
  [409, "REGISTRATION_CLOSED"],
  [400, "VALIDATION_FAILED"],
];
const DOCUMENTED_STATUS = {
  VALIDATION_FAILED: 400,
  IDEMPOTENCY_KEY_REQUIRED: 400,
  IDEMPOTENCY_KEY_INVALID: 400,
  REGISTRATION_CLOSED: 409,
  CONSENT_VERSION_MISMATCH: 409,
  SESSION_NOT_AVAILABLE: 409,
  SESSION_FULL: 409,
  IDEMPOTENCY_KEY_CONFLICT: 409,
  PLAYER_AGE_INELIGIBLE: 422,
  RATE_LIMITED: 429,
  SERVICE_TEMPORARILY_UNAVAILABLE: 503,
  REGISTRATION_PERSISTENCE_FAILED: 503,
};

test("RIC-191 handoff error mocks cover the documented status/code pairs", async () => {
  const markdown = await readFile(handoffUrl, "utf8");
  const errors = jsonBlocks(markdown)
    .map((block) => JSON.parse(block))
    .find(
      (value) =>
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((item) => item && item.code && item.statusCode),
    );
  assert.ok(errors, "a non-empty error-mock array exists");
  for (const [status, code] of REQUIRED_ERROR_FIXTURES) {
    assert.ok(
      errors.some((item) => item.statusCode === status && item.code === code),
      `missing fixture ${status} ${code}`,
    );
  }
  for (const error of errors) {
    assert.equal(
      error.statusCode,
      DOCUMENTED_STATUS[error.code],
      `${error.code} uses the documented status`,
    );
    for (const fieldError of error.fieldErrors ?? []) {
      assert.match(fieldError.code, /^[A-Z_]+$/);
    }
    if (error.code === "RATE_LIMITED") assert.equal(error.retryAfter, 600);
  }
  const config = jsonBlocks(markdown)
    .map((block) => JSON.parse(block))
    .find((value) => value && value.consent && value.idempotencyKey);
  assert.ok(config, "the registration-config fixture exists");
  for (const item of config.consent.items) {
    for (const locale of ["en", "ms", "zh-Hans"]) {
      assert.match(item.content[locale].sha256, /^[0-9a-f]{64}$/);
    }
    assert.equal(item.defaultChecked, false);
  }
});
