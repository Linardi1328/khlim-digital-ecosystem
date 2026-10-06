import { execFileSync } from "node:child_process";

// Always rebuild: dist existence alone cannot prove it matches the current source.
const env = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL || "postgresql://localhost:5432/khlim_validation",
};
for (const args of [["prisma:generate"], ["--filter", "@khlim/api", "build"]]) {
  execFileSync("pnpm", args, { stdio: "inherit", env });
}
