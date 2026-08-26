import type { DeploymentEnvironment } from "./environment";

export type LogLevel = "info" | "warn" | "error";

export interface StructuredLogger {
  info(message: string, metadata?: Record<string, unknown>): void;
  warn(message: string, metadata?: Record<string, unknown>): void;
  error(message: string, metadata?: Record<string, unknown>): void;
}

const sensitiveKeyPattern =
  /authorization|cookie|password|secret|token|api[-_]?key|card|cvv/i;

function sanitizeMetadata(value: unknown, depth = 0): unknown {
  if (depth > 5) {
    return "[truncated]";
  }

  if (Array.isArray(value)) {
    return value.slice(0, 25).map((item) => sanitizeMetadata(item, depth + 1));
  }

  if (value && typeof value === "object") {
    const sanitized: Record<string, unknown> = {};

    for (const [key, nestedValue] of Object.entries(value)) {
      sanitized[key] = sensitiveKeyPattern.test(key)
        ? "[redacted]"
        : sanitizeMetadata(nestedValue, depth + 1);
    }

    return sanitized;
  }

  if (typeof value === "string" && value.length > 2000) {
    return `${value.slice(0, 2000)}[truncated]`;
  }

  return value;
}

export function createStructuredLogger(options: {
  deploymentEnv: DeploymentEnvironment;
  service: string;
}): StructuredLogger {
  function write(
    level: LogLevel,
    message: string,
    metadata: Record<string, unknown> = {},
  ): void {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: options.service,
      environment: options.deploymentEnv,
      message,
      metadata: sanitizeMetadata(metadata),
    });

    const stream = level === "info" ? process.stdout : process.stderr;
    stream.write(`${entry}\n`);
  }

  return {
    info: (message, metadata) => write("info", message, metadata),
    warn: (message, metadata) => write("warn", message, metadata),
    error: (message, metadata) => write("error", message, metadata),
  };
}
