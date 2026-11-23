import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  DEDICATED_STAGING_BRANCH,
  STAGING_VERCEL_API_PROJECT_ID,
  STAGING_VERCEL_TEAM_ID,
} from "../../scripts/verify-hosted-staging-acceptance.mjs";

const read = (path) =>
  readFile(new URL(`../../${path}`, import.meta.url), "utf8");
const API_HOST = "khlim-api-abc123xyz-rbl-productions.vercel.app";
const DEPLOYMENT_ID = "dpl_MockStaging001";
const APPROVED_SHA = "80aac16f46ff4cb0e75c3b15b899db515d74764c";
const candidateMetadata = {
  id: DEPLOYMENT_ID,
  ownerId: STAGING_VERCEL_TEAM_ID,
  projectId: STAGING_VERCEL_API_PROJECT_ID,
  url: API_HOST,
  target: null,
  readyState: "READY",
  status: "READY",
  gitSource: { ref: DEDICATED_STAGING_BRANCH, sha: APPROVED_SHA },
};

for (const command of ["bash", "jq"]) {
  const check = spawnSync(command, ["--version"]);
  assert.equal(
    check.status,
    0,
    `The offline RIC-65 runbook test requires ${command} on PATH`,
  );
}

test("the raw Vercel operator procedure validates each optional alias array", async () => {
  const doc = await read("docs/testing/ric-65-hosted-staging-acceptance.md");
  const section = doc.split(
    "## Verify the raw Vercel response after deployment approval",
  )[1];
  const procedure = section.split("```bash\n")[1].split("```")[0];
  const check = (metadata) =>
    spawnSync(
      "bash",
      [
        "-c",
        `curl() { cat >/dev/null; printf '%s\\n' "$REVIEW_FIXTURE"; }
${procedure}`,
      ],
      {
        env: {
          PATH: process.env.PATH,
          review_id: DEPLOYMENT_ID,
          review_project: STAGING_VERCEL_API_PROJECT_ID,
          review_host: API_HOST,
          review_sha: APPROVED_SHA,
          KHLIM_STAGING_VERCEL_TOKEN: "mock-token",
          REVIEW_FIXTURE: JSON.stringify(metadata),
        },
        encoding: "utf8",
      },
    );
  const omitted = check(candidateMetadata);
  assert.equal(omitted.status, 0, omitted.stderr);
  assert.equal(omitted.stdout.trim(), "true");
  for (const field of ["alias", "automaticAliases", "userAliases"]) {
    for (const value of [null, false, 0, API_HOST, {}, [API_HOST]]) {
      const result = check({ ...candidateMetadata, [field]: value });
      assert.equal(result.status, 1, field);
      assert.equal(result.stdout.trim(), "false", field);
    }
    const result = check({
      ...candidateMetadata,
      [field]: ["elsewhere.vercel.app"],
    });
    assert.equal(result.status, 0, field);
    assert.equal(result.stdout.trim(), "true", field);
  }
});
