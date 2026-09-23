import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSession, type Session } from "@/lib/session";
import { forbidden, internalError, unauthorized } from "@/lib/http/problem";

// Guard bersama endpoint staff: sesi aktif + role petugas/admin.
// 401 generik untuk non-ACTIVE, 403 untuk role lain (sesuai openapi).
export async function guardStaff(request: NextRequest): Promise<Session | NextResponse> {
  const instance = new URL(request.url).pathname;
  let session: Session | null;
  try {
    session = await getSession(request);
  } catch (e) {
    console.error("Gagal memeriksa sesi", e);
    return internalError(instance);
  }
  if (!session || session.user.status !== "ACTIVE") {
    return unauthorized(instance);
  }
  if (session.user.role !== "petugas" && session.user.role !== "admin") {
    return forbidden(instance);
  }
  return session;
}
