import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

// Frozen at the reviewed revisions in PR #126 before hosted application.
// Prisma records these checksums in _prisma_migrations. Further corrections
// require separately reviewed migrations with their own checksums.
const FROZEN = {
  "20261125000000_academy_registration_v1":
    "aae10d0e38c1d26841029918c924489e87a61443262f4107bfdbfe7675694123",
  "20261126000000_academy_registration_lock_corrections":
    "43e5e20b45bdcbdc34049d6dab720e5b5d5152c3f97cd179fb5e9861454a7afb",
};

for (const [name, checksum] of Object.entries(FROZEN)) {
  test(`frozen RIC-190 migration ${name} is unchanged`, async () => {
    const sql = await readFile(
      new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(sql).digest("hex"),
      checksum,
      `${name} is frozen; add a new migration instead of editing it`,
    );
  });
}
