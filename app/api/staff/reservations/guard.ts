import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSessionUser, type SessionUser } from "@/lib/auth";
import { Role } from "@/generated/prisma/enums";
import { forbidden, internalError, unauthorized } from "@/lib/http/problem";

export async function guardStaff(request: NextRequest): Promise<SessionUser | NextResponse> {
  const instance = new URL(request.url).pathname;
  let user: SessionUser | null;
  try {
    // Sumber kebenaran tunggal: cookie ruvana_session + expiry + user ACTIVE (lib/auth).
    user = await getSessionUser();
  } catch (e) {
    console.error("Gagal memeriksa sesi", e);
    return internalError(instance);
  }
  // getSessionUser mengembalikan null untuk: tanpa cookie, session tidak ada,
  // expired, user tidak ada, atau status bukan ACTIVE → 401 generik.
  if (!user) {
    return unauthorized(instance);
  }
  if (user.role !== Role.petugas && user.role !== Role.admin) {
    return forbidden(instance);
  }
  return user;
}
