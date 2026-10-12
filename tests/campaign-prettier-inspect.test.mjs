import test from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as prettier from "prettier";

test("temporary formatter diagnostic", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const file = path.join(root, "tests/campaign-analytics-permissions.test.mjs");
  const actual = fs.readFileSync(file, "utf-8");
  const config = await prettier.resolveConfig(file);
  const formatted = await prettier.format(actual, { ...config, filepath: file });
  if (actual !== formatted) {
    console.log("PRETTIER_EXPECTED_BEGIN");
    console.log(formatted);
    console.log("PRETTIER_EXPECTED_END");
  }
});
