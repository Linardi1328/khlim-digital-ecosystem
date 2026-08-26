import { execFileSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const expectedNodeMajor = 24;
const expectedPnpmVersion = "10.15.0";

function fail(message) {
  throw new Error(`Bootstrap verification failed: ${message}`);
}

const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor !== expectedNodeMajor) {
  fail(`Node ${expectedNodeMajor}.x is required; found ${process.versions.node}`);
}

const pnpmVersion = execFileSync("pnpm", ["--version"], {
  encoding: "utf8",
}).trim();
if (pnpmVersion !== expectedPnpmVersion) {
  fail(`pnpm ${expectedPnpmVersion} is required; found ${pnpmVersion}`);
}

const requiredFiles = [
  "pnpm-lock.yaml",
  ".env.example",
  "config/environments/staging.env.example",
  "config/environments/production.env.example",
  "openapi/khlim-v1.json",
  "packages/api-client/src/schema.d.ts",
];

for (const path of requiredFiles) {
  await access(new URL(path, root));
}

const developmentTemplate = await readFile(new URL(".env.example", root), "utf8");
for (const key of [
  "KHLIM_ENV=development",
  "NEXT_PUBLIC_API_BASE_URL=",
  "DATABASE_URL=",
  "SUPABASE_JWT_ISSUER=",
  "NEXT_PUBLIC_SUPABASE_URL=",
  "SENTRY_DSN=",
]) {
  if (!developmentTemplate.includes(key)) {
    fail(`missing ${key} from .env.example`);
  }
}

console.log(
  JSON.stringify({
    event: "bootstrap.verified",
    node: process.versions.node,
    pnpm: pnpmVersion,
  }),
);
