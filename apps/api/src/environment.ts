export type RuntimeEnvironment = "development" | "test" | "staging" | "production";

export interface ApiRuntimeConfig {
  nodeEnv: RuntimeEnvironment;
  port: number;
}

const allowedEnvironments = new Set<RuntimeEnvironment>([
  "development",
  "test",
  "staging",
  "production",
]);

export function loadApiRuntimeConfig(
  environment: NodeJS.ProcessEnv = process.env,
): ApiRuntimeConfig {
  const nodeEnv = environment.NODE_ENV ?? "development";

  if (!allowedEnvironments.has(nodeEnv as RuntimeEnvironment)) {
    throw new Error(`Invalid NODE_ENV: ${nodeEnv}`);
  }

  const port = Number(environment.PORT ?? 3001);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT: ${environment.PORT ?? ""}`);
  }

  return {
    nodeEnv: nodeEnv as RuntimeEnvironment,
    port,
  };
}
