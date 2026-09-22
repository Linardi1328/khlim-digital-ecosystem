import { readFileSync } from "node:fs";
import { test } from "node:test";
import prettier from "prettier";

test("temporary checkout recovery formatting diagnostic", async () => {
  const path = "tests/integration/payment-concurrency-hardening.test.mjs";
  const source = readFileSync(path, "utf8");
  const formatted = await prettier.format(source, { filepath: path });
  const start = formatted.indexOf('await t.test(\n        "stale checkout recovery');
  const end = formatted.indexOf("    } finally {", start);
  console.log("PRETTIER_CHECKOUT_START");
  console.log(formatted.slice(start, end));
  console.log("PRETTIER_CHECKOUT_END");
});
