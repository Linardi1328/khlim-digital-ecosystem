import { readFileSync } from "node:fs";
import { test } from "node:test";
import prettier from "prettier";

test("temporary Admin MFA formatting diagnostic", async () => {
  for (const path of [
    "apps/admin/components/layout/AdminShell.tsx",
    "apps/admin/lib/supabase-auth.ts",
  ]) {
    const source = readFileSync(path, "utf8");
    const formatted = await prettier.format(source, { filepath: path });
    console.log(`PRETTIER_ADMIN_MFA_START:${path}`);
    console.log(formatted);
    console.log(`PRETTIER_ADMIN_MFA_END:${path}`);
  }
});
