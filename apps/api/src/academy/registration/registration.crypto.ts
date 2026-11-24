import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export interface HmacKey {
  version: string;
  key: Buffer;
}

export interface HmacKeyRing {
  current: HmacKey;
  all: HmacKey[];
}

/**
 * `KHLIM_REGISTRATION_HMAC_KEYS` = `version:base64secret[,version:base64secret…]`.
 * The first entry signs new records; every entry stays valid for replay lookup
 * so rotating the current key never breaks an in-flight retry. Returns null
 * (registration closed) when unset or malformed; secrets are never logged.
 */
export function loadHmacKeyRing(
  environment: NodeJS.ProcessEnv = process.env,
): HmacKeyRing | null {
  const raw = environment.KHLIM_REGISTRATION_HMAC_KEYS?.trim();
  if (!raw) return null;
  const keys: HmacKey[] = [];
  for (const entry of raw.split(",")) {
    const separator = entry.indexOf(":");
    if (separator < 1) return null;
    const version = entry.slice(0, separator).trim();
    const key = Buffer.from(entry.slice(separator + 1).trim(), "base64");
    if (!/^[A-Za-z0-9]{1,16}$/.test(version) || key.length < 32) return null;
    if (keys.some((existing) => existing.version === version)) return null;
    keys.push({ version, key });
  }
  const current = keys[0];
  return current ? { current, all: keys } : null;
}

export function hmacHex(key: HmacKey, domain: string, data: string): string {
  return createHmac("sha256", key.key)
    .update(`khlim:registration:${domain}\n`)
    .update(data)
    .digest("hex");
}

export function constantTimeEqualHex(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Deterministic JSON: object keys sorted recursively, no insignificant whitespace. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** `KAR-` + 8 Crockford base32 characters (40 bits from the CSPRNG). */
export function generateReferenceCode(): string {
  const bytes = randomBytes(8);
  let code = "";
  for (let index = 0; index < 8; index += 1) {
    code += CROCKFORD[bytes[index]! & 31];
  }
  return `KAR-${code}`;
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
