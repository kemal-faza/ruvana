import type { NextRequest } from "next/server";
import { problemResponse } from "@/lib/http/problem";

export function originError(request: NextRequest) {
  const origin = request.headers.get("origin");
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  const allowed = new Set<string>();
  if (configuredOrigin) {
    try { allowed.add(new URL(configuredOrigin).origin); } catch { /* Konfigurasi tidak valid tidak mengizinkan Origin. */ }
  }
  if (process.env.NODE_ENV !== "production") allowed.add(new URL(request.url).origin);

  let valid = false;
  if (origin && origin !== "null" && !origin.includes(",")) {
    try {
      const parsed = new URL(origin);
      valid = (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.origin === origin && allowed.has(origin);
    } catch {
      valid = false;
    }
  }
  if (valid) return null;
  return problemResponse({
    status: 403,
    code: "CSRF_ORIGIN_REJECTED",
    title: "Permintaan ditolak",
    detail: "Origin permintaan tidak diizinkan.",
    instance: request.nextUrl.pathname,
  });
}
