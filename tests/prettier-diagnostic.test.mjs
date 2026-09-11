import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import * as prettier from "prettier";

test("prints exact Prettier output for RLS test", async () => {
  const targetUrl = new URL("./supabase-data-api-rls.test.mjs", import.meta.url);
  const targetPath = fileURLToPath(targetUrl);
  const source = await readFile(targetUrl, "utf8");
  const config = (await prettier.resolveConfig(targetPath)) ?? {};
  const formatted = await prettier.format(source, {
    ...config,
    filepath: targetPath,
  });

  console.log(`PRETTIER_OUTPUT_BASE64=${Buffer.from(formatted).toString("base64")}`);
});
