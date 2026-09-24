import { NextRequest, NextResponse } from "next/server";
import { internalError, problemResponse } from "@/lib/http/problem";
import { currentAccount } from "@/lib/services/auth-service";

export async function GET(request: NextRequest) {
  const instance = request.nextUrl.pathname;
  try {
    const user = await currentAccount();
    if (!user) {
      return problemResponse({ status: 401, code: "UNAUTHORIZED", title: "Autentikasi diperlukan", detail: "Sesi tidak valid atau akun tidak aktif.", instance });
    }
    return NextResponse.json({ user }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal membaca akun sesi", error);
    return internalError(instance);
  }
}
