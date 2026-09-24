import { createHash } from "node:crypto";

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidIdempotencyKey(value: string | null): boolean {
  if (value === null) return false;
  // harus single value, tidak mengandung koma (multiple)
  if (value.includes(",")) return false;
  return UUID_V4_REGEX.test(value.trim());
}

export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJson(v)).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`);
  return `{${entries.join(",")}}`;
}

export function hashCanonicalBody(body: unknown): string {
  const canonical = canonicalJson(body);
  return createHash("sha256").update(canonical).digest("hex");
}

export function buildIdempotencyScope(method: string, path: string): string {
  // scope mencegah replay lintas resource
  return `${method.toUpperCase()}:${path}`;
}
