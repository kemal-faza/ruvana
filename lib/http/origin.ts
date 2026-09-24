import type { NextRequest } from "next/server";
import { csrfOriginRejected } from "@/lib/http/problem";

export interface OriginValidationResult {
  ok: boolean;
  error?: "missing" | "multiple" | "null" | "malformed" | "not_allowed";
}

/**
 * Validasi header Origin sesuai OpenAPI:
 * - wajib hadir tepat satu kali
 * - menolak missing, malformed, literal "null", multiple values
 * - dibandingkan exact scheme+host+port terhadap allowlist
 */
export function validateOrigin(request: NextRequest, allowedOrigins: string[]): OriginValidationResult {
  // NextRequest.headers adalah Headers yang menggabungkan duplikat dengan ","
  // Untuk mendeteksi multiple, cek nilai mentah yang mengandung koma di mana Origin tidak boleh mengandung koma.
  const origin = request.headers.get("origin");

  if (origin === null) {
    return { ok: false, error: "missing" };
  }

  // Jika client mengirim dua header Origin, Headers akan menggabungkan jadi "origin1, origin2"
  // Deteksi ini sebagai multiple.
  if (origin.includes(",")) {
    return { ok: false, error: "multiple" };
  }

  const trimmed = origin.trim();

  if (trimmed === "" || trimmed.toLowerCase() === "null") {
    return { ok: false, error: "null" };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, error: "malformed" };
  }

  // Origin harus hanya scheme+host+port tanpa path/query/fragment
  if (parsed.pathname !== "/" && parsed.pathname !== "") {
    if (trimmed !== parsed.origin) {
      return { ok: false, error: "malformed" };
    }
  }
  if (parsed.search !== "" || parsed.hash !== "") {
    return { ok: false, error: "malformed" };
  }

  const normalized = parsed.origin;
  if (!allowedOrigins.includes(normalized)) {
    return { ok: false, error: "not_allowed" };
  }

  return { ok: true };
}

export function getAllowedOrigins(): string[] {
  const env = process.env.ALLOWED_ORIGINS;
  if (env && env.trim().length > 0) {
    return env
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  // Default untuk lokal dan Vercel preview/production
  // Host deployment akan mengisi ALLOWED_ORIGINS di production
  return ["http://127.0.0.1:3000", "http://localhost:3000", "https://app.example.invalid"];
}

export function originError(request: NextRequest) {
  const allowed = new Set<string>();
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredOrigin) {
    try {
      const parsed = new URL(configuredOrigin);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") allowed.add(parsed.origin);
    } catch {
      // Konfigurasi tidak valid tidak mengizinkan Origin.
    }
  }
  if (process.env.NODE_ENV !== "production") allowed.add(new URL(request.url).origin);

  if (validateOrigin(request, [...allowed]).ok) return null;
  return csrfOriginRejected(request.nextUrl.pathname);
}
