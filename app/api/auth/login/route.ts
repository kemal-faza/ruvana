import { NextRequest, NextResponse } from "next/server";
import { JENDELA_LOGIN_MENIT } from "@/config/business";
import { originError } from "@/lib/http/origin";
import { badRequest, internalError, problemResponse, validationFailed } from "@/lib/http/problem";
import { loginWithCredentials } from "@/lib/services/auth-service";

export async function POST(request: NextRequest) {
  const rejected = originError(request);
  if (rejected) return rejected;
  const instance = request.nextUrl.pathname;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest(instance, "JSON tidak dapat diproses.");
  }

  try {
    const ip = request.headers.get("x-real-ip") ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const result = await loginWithCredentials(body, ip);
    if (result.kind === "validation") return validationFailed(instance, result.errors);
    if (result.kind === "invalid") {
      return problemResponse({ status: 401, code: "INVALID_CREDENTIALS", title: "Autentikasi gagal", detail: "Email atau kata sandi salah.", instance });
    }
    if (result.kind === "rate_limited") {
      const response = problemResponse({ status: 429, code: "LOGIN_RATE_LIMITED", title: "Terlalu banyak percobaan login", detail: "Coba lagi setelah 15 menit.", instance });
      response.headers.set("Retry-After", String(JENDELA_LOGIN_MENIT * 60));
      return response;
    }
    return NextResponse.json({ user: result.user, expiresAt: result.expiresAt }, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Gagal masuk", error);
    return internalError(instance);
  }
}
