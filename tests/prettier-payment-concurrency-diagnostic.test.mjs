import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import prettier from "prettier";

test("diagnose payment concurrency formatting", async () => {
  const path = "tests/integration/payment-concurrency-hardening.test.mjs";
  const source = await readFile(path, "utf8");
  const formatted = await prettier.format(source, { filepath: path });
  if (source !== formatted) {
    const dir = await mkdtemp(join(tmpdir(), "khlim-prettier-"));
    const before = join(dir, "before.mjs");
    const after = join(dir, "after.mjs");
    await writeFile(before, source);
    await writeFile(after, formatted);
    const diff = spawnSync("diff", ["-u", before, after], {
      encoding: "utf8",
    });
    console.log("PRETTIER_DIAGNOSTIC_START\n" + diff.stdout + "PRETTIER_DIAGNOSTIC_END");
  }
  assert.ok(true);
});
