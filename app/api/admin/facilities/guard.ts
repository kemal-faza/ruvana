import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import type { Role } from "@/generated/prisma/enums";
import { forbidden, internalError, unauthorized } from "@/lib/http/problem";
import { currentAccount } from "@/lib/services/auth-service";

export interface AdminApiAccount {
  id: number;
  nama: string;
  role: Role;
}

/** Guard bersama untuk seluruh route admin fasilitas: sesi ACTIVE + role admin. */
export async function guardAdmin(request: NextRequest): Promise<AdminApiAccount | NextResponse> {
  const instance = request.nextUrl.pathname;
  let account: Awaited<ReturnType<typeof currentAccount>>;
  try {
    account = await currentAccount();
  } catch (error) {
    console.error("Gagal memeriksa sesi admin", error);
    return internalError(instance);
  }
  if (!account) return unauthorized(instance);
  if (account.role !== "admin") return forbidden(instance);
  return { id: account.id, nama: account.nama, role: account.role };
}
