export type NodeEnvironment = "development" | "test" | "production";
export type DeploymentEnvironment = "development" | "staging" | "production";

export interface ApiRuntimeConfig {
  nodeEnv: NodeEnvironment;
  deploymentEnv: DeploymentEnvironment;
  port: number;
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

  if (!allowedDeploymentEnvironments.has(deploymentEnv as DeploymentEnvironment)) {
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

  return {
    nodeEnv: nodeEnv as NodeEnvironment,
    deploymentEnv: deploymentEnv as DeploymentEnvironment,
    port,
  };
}
