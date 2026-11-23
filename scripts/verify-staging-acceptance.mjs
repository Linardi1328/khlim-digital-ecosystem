import { pathToFileURL } from "node:url";
import {
  runHostedStagingAcceptance,
  sanitizeErrorMessage,
} from "./verify-hosted-staging-acceptance.mjs";

const required = [
  "KHLIM_STAGING_WEB_URL",
  "BILLPLZ_SECRET_KEY",
  "BILLPLZ_COLLECTION_ID",
  "BILLPLZ_X_SIGNATURE_KEY",
];

export async function runStagingAcceptance(env = process.env) {
  for (const name of required) {
    const value = env[name]?.trim();
    if (!value || /replace-with|example|placeholder/i.test(value)) {
      throw new Error(`${name} is missing or still a placeholder`);
    }
  }
  if (env.BILLPLZ_SANDBOX !== "1") {
    throw new Error(
      "BILLPLZ_SANDBOX must be 1; staging acceptance refuses production payments",
    );
  }
  if (env.PAYMENT_PROVIDER !== "billplz") {
    throw new Error(
      "PAYMENT_PROVIDER must be billplz in the staging acceptance environment",
    );
  }

  const results = await runHostedStagingAcceptance({
    ...env,
    KHLIM_STAGING_ACTIVE_WINDOW_AUTHORIZED: "0",
  });
  console.log(
    JSON.stringify({
      event: "staging.acceptance.ready",
      readiness: results.readiness,
      paymentProvider: "billplz",
      billplzSandbox: true,
      note: "Billplz credentials were checked for presence only.",
    }),
  );
  return results;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runStagingAcceptance().catch((error) => {
    console.error(`staging.acceptance.failed: ${sanitizeErrorMessage(error)}`);
    process.exitCode = 1;
  });
}
