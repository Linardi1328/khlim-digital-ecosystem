import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { test } from "node:test";

import {
  createRetryableAsyncOnce,
  getWorkerBundleDir,
} from "./helpers/browser-bundle-cache.mjs";

const execFileAsync = promisify(execFile);

test("concurrent bundle consumers share one build", async () => {
  let calls = 0;
  let resolveBuild;
  const once = createRetryableAsyncOnce(() => {
    calls++;
    return new Promise((resolve) => {
      resolveBuild = resolve;
    });
  });
  const first = once();
  const second = once();
  assert.equal(first, second);
  await Promise.resolve();
  assert.equal(calls, 1);
  resolveBuild("compiled fixture");
  assert.deepEqual(await Promise.all([first, second]), [
    "compiled fixture",
    "compiled fixture",
  ]);
  assert.equal(await once(), "compiled fixture");
  assert.equal(calls, 1);
});

test("failed fixture compilation can retry on the next request", async () => {
  let builds = 0;
  const once = createRetryableAsyncOnce(() => {
    builds++;
    if (builds === 1) throw new Error("synthetic build failure");
    return "recovered fixture";
  });
  await assert.rejects(once(), /synthetic build failure/);
  assert.equal(await once(), "recovered fixture");
  assert.equal(builds, 2);
});

test("separate Node processes isolate browser bundle files", async () => {
  const root = mkdtempSync(
    path.join(os.tmpdir(), "khlim-browser-worker-test-"),
  );
  try {
    const helperUrl = new URL(
      "./helpers/browser-bundle-cache.mjs",
      import.meta.url,
    ).href;
    const script = `
import { getWorkerBundleDir } from ${JSON.stringify(helperUrl)};
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
const dir = getWorkerBundleDir(${JSON.stringify(root)});
mkdirSync(dir, { recursive: true });
const filename = path.join(dir, "bundle.js");
writeFileSync(filename, String(process.pid));
setTimeout(() => {
  if (readFileSync(filename, "utf8") !== String(process.pid)) {
    process.exitCode = 1;
  } else {
    process.stdout.write(dir);
  }
  rmSync(dir, { recursive: true, force: true });
}, 75);
`;
    const [one, two] = await Promise.all([
      execFileAsync(process.execPath, ["--input-type=module", "-e", script]),
      execFileAsync(process.execPath, ["--input-type=module", "-e", script]),
    ]);
    assert.notEqual(one.stdout, two.stdout);
    assert.equal(one.stderr, "");
    assert.equal(two.stderr, "");
    assert.notEqual(
      getWorkerBundleDir(root, 123),
      getWorkerBundleDir(root, 124),
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
