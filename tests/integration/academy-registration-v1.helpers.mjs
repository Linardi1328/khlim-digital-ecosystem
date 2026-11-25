import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { inspect } from "node:util";

const apiRequire = createRequire(
  new URL("../../apps/api/package.json", import.meta.url),
);
const require = createRequire(import.meta.url);

export const { UnauthorizedException } = apiRequire("@nestjs/common");
export const { NestFactory } = apiRequire("@nestjs/core");
export const { AppModule } = require("../../apps/api/dist/app.module.js");
export const {
  PrismaService,
} = require("../../apps/api/dist/database/prisma.service.js");
export const {
  SupabaseJwtService,
} = require("../../apps/api/dist/auth/supabase-jwt.service.js");
export const {
  RegistrationPublicService,
} = require("../../apps/api/dist/academy/registration/registration-public.service.js");
export const {
  RegistrationPolicyService,
  resolveDeploymentTier,
} = require("../../apps/api/dist/academy/registration/registration-policy.service.js");
export const {
  loadHmacKeyRing,
} = require("../../apps/api/dist/academy/registration/registration.crypto.js");
export const {
  createOpenApiDocument,
} = require("../../apps/api/dist/openapi.js");
export const {
  createStructuredLogger,
} = require("../../apps/api/dist/logger.js");
export const {
  scrubRegistrationEvent,
} = require("../../apps/api/dist/observability/registration-privacy.js");

export const ORG_A = "00000000-0000-4000-8000-000000000001";
export const ORG_B = randomUUID();
export const RUN = randomUUID().slice(0, 8).toUpperCase();

export const HMAC_V1 = randomBytes(32).toString("base64");
export const HMAC_V2 = randomBytes(32).toString("base64");

export function databaseTestsEnabled() {
  if (process.env.KHLIM_TEST_DATABASE !== "1") return false;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!databaseName.toLowerCase().includes("test")) {
    throw new Error(
      "Registration tests require a database whose name contains 'test'",
    );
  }
  const host = new URL(databaseUrl).hostname;
  if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host)) {
    throw new Error(
      "Registration tests only run against a local disposable database",
    );
  }
  return true;
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function klToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date());
}

export function addDays(iso, days) {
  const date = new Date(`${iso}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** First Saturday that is at least `minDays` after today (KL). */
export function nextSaturday(minDays = 7) {
  let candidate = addDays(klToday(), minDays);
  while (new Date(`${candidate}T00:00:00.000Z`).getUTCDay() !== 6) {
    candidate = addDays(candidate, 1);
  }
  return candidate;
}

/** Same month/day N years away; 29 February becomes 28 February in non-leap years. */
export function shiftYears(iso, years) {
  const [y, m, d] = iso.split("-").map(Number);
  const year = y + years;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const day = m === 2 && d === 29 && !leap ? 28 : d;
  return `${String(year).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function policyContent(label) {
  const types = [
    "GUARDIAN_AUTHORITY",
    "REGISTRATION_PRIVACY",
    "MARKETING",
    "PHOTOGRAPHY",
  ];
  const locales = ["en", "ms", "zh-Hans"];
  return Object.fromEntries(
    types.map((type) => [
      type,
      Object.fromEntries(
        locales.map((locale) => {
          const ref = `ref://synthetic/${label}/${type}/${locale}`;
          return [locale, { ref, sha256: sha256(ref) }];
        }),
      ),
    ]),
  );
}

let phoneCounter = 0;
const phoneBase = 1000000 + Math.floor(Math.random() * 7000000);
export function nextPhone() {
  phoneCounter += 1;
  return "+6012" + String(phoneBase + phoneCounter).slice(-7);
}

export function newKey() {
  return randomBytes(24).toString("base64url");
}

export function newIp() {
  return `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${1 + Math.floor(Math.random() * 250)}`;
}

export async function http(baseUrl, path, options = {}) {
  const headers = new Headers(options.headers ?? {});
  if (options.token) headers.set("authorization", `Bearer ${options.token}`);
  if (options.body !== undefined)
    headers.set("content-type", "application/json");
  if (options.key) headers.set("idempotency-key", options.key);
  headers.set("x-forwarded-for", options.ip ?? newIp());
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { status: response.status, headers: response.headers, body, text };
}

export function dbText(error) {
  return inspect(error, { depth: 8 });
}

export async function expectDbReject(fn, pattern) {
  let failure;
  try {
    await fn();
  } catch (error) {
    failure = error;
  }
  if (!failure)
    throw new Error(`Expected database rejection matching ${pattern}`);
  const text = dbText(failure);
  if (!pattern.test(text)) {
    throw new Error(`Rejected, but not with ${pattern}: ${text.slice(0, 400)}`);
  }
}

export function captureOutput() {
  const chunks = [];
  const originals = { out: process.stdout.write, err: process.stderr.write };
  process.stdout.write = (chunk, ...rest) => {
    chunks.push(String(chunk));
    return originals.out.call(process.stdout, chunk, ...rest);
  };
  process.stderr.write = (chunk, ...rest) => {
    chunks.push(String(chunk));
    return originals.err.call(process.stderr, chunk, ...rest);
  };
  return {
    text: () => chunks.join(""),
    restore() {
      process.stdout.write = originals.out;
      process.stderr.write = originals.err;
    },
  };
}

/**
 * A LoggerService that runs every call through the production structured
 * logger (same formatting and sanitizing) but records the output instead of
 * writing it to the terminal, so tests can assert on what production would log.
 */
export function recordingAppLogger() {
  const lines = [];
  const production = createStructuredLogger({
    service: "khlim-api",
    deploymentEnv: "development",
  });
  const methods = ["log", "info", "warn", "error", "debug", "verbose", "fatal"];
  const logger = {};
  for (const method of methods) {
    logger[method] = (...args) => {
      const out = process.stdout.write;
      const err = process.stderr.write;
      const sink = (chunk) => {
        lines.push(String(chunk));
        return true;
      };
      process.stdout.write = sink;
      process.stderr.write = sink;
      try {
        production[method](...args);
      } finally {
        process.stdout.write = out;
        process.stderr.write = err;
      }
    };
  }
  return { logger, text: () => lines.join("") };
}
