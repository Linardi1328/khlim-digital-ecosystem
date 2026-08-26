import type { LoggerService } from "@nestjs/common";
import type { DeploymentEnvironment } from "./environment";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface StructuredLogger extends LoggerService {
  info(message: string, metadata?: Record<string, unknown>): void;
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
    message: unknown,
    optionalParams: unknown[] = [],
  ): void {
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: options.service,
      environment: options.deploymentEnv,
      message: typeof message === "string" ? message : String(message),
      metadata: sanitizeMetadata(optionalParams),
    });

    const stream = level === "info" || level === "debug" ? process.stdout : process.stderr;
    stream.write(`${entry}\n`);
  }

  return {
    log: (message, ...optionalParams) => write("info", message, optionalParams),
    info: (message, metadata) => write("info", message, metadata ? [metadata] : []),
    warn: (message, ...optionalParams) => write("warn", message, optionalParams),
    error: (message, ...optionalParams) => write("error", message, optionalParams),
    debug: (message, ...optionalParams) => write("debug", message, optionalParams),
    verbose: (message, ...optionalParams) => write("debug", message, optionalParams),
    fatal: (message, ...optionalParams) => write("fatal", message, optionalParams),
  };
}
