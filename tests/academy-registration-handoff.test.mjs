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

test("RIC-191 handoff error mocks use stable codes only and no personal data", async () => {
  const markdown = await readFile(handoffUrl, "utf8");
  const errors = jsonBlocks(markdown)
    .map((block) => JSON.parse(block))
    .find((value) => Array.isArray(value) && value.every((item) => item.code));
  assert.ok(errors, "an error-mock array exists");
  for (const error of errors) {
    assert.match(error.code, /^[A-Z_]+$/);
    assert.equal(typeof error.statusCode, "number");
    for (const fieldError of error.fieldErrors ?? []) {
      assert.match(fieldError.code, /^[A-Z_]+$/);
    }
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
