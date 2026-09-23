import { NextRequest } from "next/server";
import { originError } from "@/lib/http/origin";
import { internalError, problemResponse } from "@/lib/http/problem";
import { currentAccount, logoutCurrentSession } from "@/lib/services/auth-service";

export async function POST(request: NextRequest) {
  const instance = request.nextUrl.pathname;
  try {
    if (!(await currentAccount())) {
      return problemResponse({ status: 401, code: "UNAUTHORIZED", title: "Autentikasi diperlukan", detail: "Sesi tidak valid atau akun tidak aktif.", instance });
    }
    const rejected = originError(request);
    if (rejected) return rejected;
    await logoutCurrentSession();
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal keluar", error);
    return internalError(instance);
  }
}
