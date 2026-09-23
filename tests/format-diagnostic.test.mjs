import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { format, resolveConfig } from "prettier";

test("temporary format diagnostic", async () => {
  const paths = [
    "apps/api/src/billing/billing.service.ts",
    "tests/integration/payment-concurrency-hardening.test.mjs",
  ];
  const dir = await mkdtemp(join(tmpdir(), "khlim-format-"));
  try {
    for (const path of paths) {
      const source = await readFile(path, "utf8");
      const config = (await resolveConfig(path)) ?? {};
      const formatted = await format(source, { ...config, filepath: path });
      const output = join(dir, path.replaceAll("/", "__"));
      await writeFile(output, formatted);
      try {
        execFileSync("diff", ["-u", path, output], { encoding: "utf8" });
      } catch (error) {
        const stdout =
          error && typeof error === "object" && "stdout" in error
            ? String(error.stdout)
            : "";
        console.log(`FORMAT_DIFF_START ${path}\n${stdout}\nFORMAT_DIFF_END ${path}`);
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
