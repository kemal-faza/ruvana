import type { NextRequest } from "next/server";
import { problemResponse } from "@/lib/http/problem";

export interface OriginValidationResult {
  ok: boolean;
  error?: "missing" | "multiple" | "null" | "malformed" | "not_allowed";
}

/** Validates a single HTTP(S) Origin against an exact scheme, host, and port allowlist. */
export function validateOrigin(request: NextRequest, allowedOrigins: string[]): OriginValidationResult {
  const origin = request.headers.get("origin");
  if (origin === null) return { ok: false, error: "missing" };
  if (origin.includes(",")) return { ok: false, error: "multiple" };

  const value = origin.trim();
  if (!value || value.toLowerCase() === "null") return { ok: false, error: "null" };

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, error: "malformed" };
  }

  if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || parsed.origin !== value) {
    return { ok: false, error: "malformed" };
  }
  if (!allowedOrigins.includes(parsed.origin)) return { ok: false, error: "not_allowed" };
  return { ok: true };
}

export function getAllowedOrigins(request?: NextRequest): string[] {
  const configured = process.env.ALLOWED_ORIGINS;
  const candidates = configured?.trim()
    ? configured.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [process.env.NEXT_PUBLIC_SITE_URL].filter((origin): origin is string => Boolean(origin));

  if (!configured?.trim() && process.env.NODE_ENV !== "production") {
    candidates.push("http://127.0.0.1:3000", "http://localhost:3000");
    if (request) candidates.push(new URL(request.url).origin);
  }

  return [...new Set(candidates.flatMap((candidate) => {
    try {
      const parsed = new URL(candidate);
      return parsed.protocol === "http:" || parsed.protocol === "https:" ? [parsed.origin] : [];
    } catch {
      return [];
    }
  }))];
}

export function originError(request: NextRequest) {
  if (validateOrigin(request, getAllowedOrigins(request)).ok) return null;
  return problemResponse({
    status: 403,
    code: "CSRF_ORIGIN_REJECTED",
    title: "Permintaan ditolak",
    detail: "Origin permintaan tidak diizinkan.",
    instance: request.nextUrl.pathname,
  });
}
