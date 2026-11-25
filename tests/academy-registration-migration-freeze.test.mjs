import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

// Frozen at the reviewed revision (PR #126, commit 34ad433) before any hosted
// application. Prisma records this checksum in _prisma_migrations; changing the
// file would leave environments with a different applied schema. Corrections
// must be NEW, separately reviewed migrations. Do not update this value.
const FROZEN = {
  "20261125000000_academy_registration_v1":
    "aae10d0e38c1d26841029918c924489e87a61443262f4107bfdbfe7675694123",
};

test("frozen RIC-190 registration migration is unchanged", async () => {
  for (const [name, checksum] of Object.entries(FROZEN)) {
    const sql = await readFile(
      new URL(`../prisma/migrations/${name}/migration.sql`, import.meta.url),
    );
    assert.equal(
      createHash("sha256").update(sql).digest("hex"),
      checksum,
      `${name} is frozen; add a new migration instead of editing it`,
    );
  }
});
