import { NextRequest, NextResponse } from "next/server";
import { originError } from "@/lib/http/origin";
import { badRequest, internalError, problemResponse, validationFailed } from "@/lib/http/problem";
import { registerUser } from "@/lib/services/auth-service";

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
    const result = await registerUser(body);
    if (result.kind === "validation") return validationFailed(instance, result.errors);
    if (result.kind === "duplicate") return problemResponse({ status: 409, code: "EMAIL_ALREADY_USED", title: "Konflik data", detail: "Email tersebut sudah terdaftar.", instance });
    return NextResponse.json({ user: result.user }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal mendaftarkan akun", error);
    return internalError(instance);
  }
}
