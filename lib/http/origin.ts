import type { NextRequest } from "next/server";
import { csrfOriginRejected } from "@/lib/http/problem";

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

/** Host loopback yang dipakai browser lokal; aman hanya di luar produksi. */
const HOST_LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function getAllowedOrigins(request?: NextRequest): string[] {
  const configured = process.env.ALLOWED_ORIGINS;
  const candidates = configured?.trim()
    ? configured.split(",").map((origin) => origin.trim()).filter(Boolean)
    : [process.env.NEXT_PUBLIC_SITE_URL].filter((origin): origin is string => Boolean(origin));

  const nonProduction = process.env.NODE_ENV !== "production";

  if (!configured?.trim() && nonProduction) {
    candidates.push("http://127.0.0.1:3000", "http://localhost:3000");
  }

  // Di luar produksi, Next.js memilih port bebas saat 3000 atau 3001 sudah
  // dipakai proses lain. Origin milik server itu sendiri tetap diizinkan agar
  // perpindahan port dev tidak membuat login dan mutation gagalproteksi CSRF.
  if (request && nonProduction) {
    const sendiri = new URL(request.url);
    if (sendiri.protocol === "http:" && HOST_LOOPBACK.has(sendiri.hostname)) {
      candidates.push(sendiri.origin);
    }
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
  return csrfOriginRejected(request.nextUrl.pathname);
}
