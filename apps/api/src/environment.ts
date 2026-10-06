import { isIP } from "node:net";

export type NodeEnvironment = "development" | "test" | "production";
export type DeploymentEnvironment = "development" | "staging" | "production";

export interface ApiRuntimeConfig {
  nodeEnv: NodeEnvironment;
  deploymentEnv: DeploymentEnvironment;
  port: number;
  trustedProxy: false | string[];
}

const allowedNodeEnvironments = new Set<NodeEnvironment>([
  "development",
  "test",
  "production",
]);

const allowedDeploymentEnvironments = new Set<DeploymentEnvironment>([
  "development",
  "staging",
  "production",
]);

export function loadApiRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ApiRuntimeConfig {
  const nodeEnv = environment.NODE_ENV ?? "development";

  if (!allowedNodeEnvironments.has(nodeEnv as NodeEnvironment)) {
    throw new Error(`Invalid NODE_ENV: ${nodeEnv}`);
  }

  const deploymentEnv =
    environment.KHLIM_ENV ??
    (nodeEnv === "production" ? "production" : "development");

  if (
    !allowedDeploymentEnvironments.has(deploymentEnv as DeploymentEnvironment)
  ) {
    throw new Error(`Invalid KHLIM_ENV: ${deploymentEnv}`);
  }

  if (
    (deploymentEnv === "staging" || deploymentEnv === "production") &&
    nodeEnv !== "production"
  ) {
    throw new Error(`${deploymentEnv} requires NODE_ENV=production`);
  }

  const port = Number(environment.PORT ?? 3001);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${environment.PORT ?? ""}`);
  }

  // One policy for all HTTP callers. Never infer trust from the hosting platform.
  const trustProxyVal =
    environment.TRUST_PROXY ?? environment.KHLIM_TRUST_PROXY ?? "false";
  if (!["true", "1", "false", "0", ""].includes(trustProxyVal)) {
    throw new Error("TRUST_PROXY must be true, 1, false or 0");
  }
  let trustedProxy: false | string[] = false;
  if (trustProxyVal === "true" || trustProxyVal === "1") {
    const addresses = (environment.TRUST_PROXY_ADDRESSES ?? "")
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    if (addresses.length === 0) {
      throw new Error("TRUST_PROXY requires explicit TRUST_PROXY_ADDRESSES");
    }
    for (const address of addresses) {
      const [ip, prefix, extra] = address.split("/");
      const version = isIP(ip ?? "");
      if (
        !version ||
        extra !== undefined ||
        (prefix !== undefined &&
          (!/^\d+$/.test(prefix) ||
            Number(prefix) < 1 ||
            Number(prefix) > (version === 4 ? 32 : 128)))
      ) {
        throw new Error(
          "TRUST_PROXY_ADDRESSES must contain IPs or non-global CIDRs",
        );
      }
    }
    trustedProxy = addresses;
  }

  return {
    nodeEnv: nodeEnv as NodeEnvironment,
    deploymentEnv: deploymentEnv as DeploymentEnvironment,
    port,
    trustedProxy,
  };
}
