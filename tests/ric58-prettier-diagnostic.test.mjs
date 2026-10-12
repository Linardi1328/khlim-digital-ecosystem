import { test } from "node:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import * as prettier from "prettier";

test("Temporary RIC-58 formatting diagnostic", async () => {
  const filename = path.resolve("tests/campaign-analytics-web.test.mjs");
  const original = readFileSync(filename, "utf8");
  const settings = await prettier.resolveConfig(filename);
  const formatted = await prettier.format(original, {
    ...settings,
    filepath: filename,
  });
  const dir = mkdtempSync(path.join(tmpdir(), "ric58-format-"));
  try {
    const before = path.join(dir, "before.mjs");
    const after = path.join(dir, "after.mjs");
    writeFileSync(before, original);
    writeFileSync(after, formatted);
    const diff = spawnSync("diff", ["-u", before, after], {
      encoding: "utf8",
    });
    console.log("RIC58_PRETTIER_DIFF_BEGIN");
    console.log(diff.stdout || "ALREADY_FORMATTED");
    console.log("RIC58_PRETTIER_DIFF_END");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
