import { NextRequest, NextResponse } from "next/server";
import { AccountStatus, Role } from "@/generated/prisma/enums";
import { currentAccount } from "@/lib/services/auth-service";
import { badRequest, internalError, problemResponse, validationFailed } from "@/lib/http/problem";
import { originError } from "@/lib/http/origin";
import { createManagedUser, getManagedUsers } from "@/lib/services/admin-users-service";

const roles = Object.values(Role);
const statuses = Object.values(AccountStatus);

function accessDenied(instance: string, role: Role | undefined) {
  if (role === undefined) return problemResponse({ status: 401, code: "UNAUTHORIZED", title: "Autentikasi diperlukan", detail: "Sesi tidak valid atau akun tidak aktif.", instance });
  if (role !== Role.admin) return problemResponse({ status: 403, code: "FORBIDDEN", title: "Akses ditolak", detail: "Akses ini hanya tersedia untuk admin.", instance });
  return null;
}

export async function GET(request: NextRequest) {
  const instance = request.nextUrl.pathname;
  try {
    const actor = await currentAccount();
    const denied = accessDenied(instance, actor?.role);
    if (denied) return denied;

    const params = request.nextUrl.searchParams;
    const errors = [];
    const role = params.get("role");
    const status = params.get("status");
    if (role !== null && !roles.includes(role as Role)) errors.push({ field: "role", code: "INVALID_ENUM", message: "role tidak valid" });
    if (status !== null && !statuses.includes(status as AccountStatus)) errors.push({ field: "status", code: "INVALID_ENUM", message: "status tidak valid" });
    const pageRaw = params.get("page");
    const perPageRaw = params.get("perPage");
    const page = pageRaw === null ? 1 : /^\d+$/.test(pageRaw) ? Number(pageRaw) : NaN;
    const perPage = perPageRaw === null ? 20 : /^\d+$/.test(perPageRaw) ? Number(perPageRaw) : NaN;
    if (!Number.isSafeInteger(page) || page < 1) errors.push({ field: "page", code: "INVALID_INTEGER", message: "page harus bilangan bulat positif" });
    if (!Number.isSafeInteger(perPage) || perPage < 1 || perPage > 100) errors.push({ field: "perPage", code: "OUT_OF_RANGE", message: "perPage harus di antara 1 dan 100" });
    const search = params.get("search")?.trim();
    if (search !== undefined && (!search || search.length > 200)) errors.push({ field: "search", code: "OUT_OF_RANGE", message: "search harus berisi 1 sampai 200 karakter" });
    const allowedParams = new Set(["page", "perPage", "search", "role", "status"]);
    for (const key of params.keys()) if (!allowedParams.has(key)) errors.push({ field: key, code: "UNKNOWN_FIELD", message: "Parameter tidak dikenal" });
    if (errors.length) return validationFailed(instance, errors);

    const result = await getManagedUsers({ page, perPage, search, role: role as Role | undefined, status: status as AccountStatus | undefined });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal mengambil daftar akun admin", error);
    return internalError(instance);
  }
}

export async function POST(request: NextRequest) {
  const instance = request.nextUrl.pathname;
  const rejected = originError(request);
  if (rejected) return rejected;
  try {
    const actor = await currentAccount();
    const denied = accessDenied(instance, actor?.role);
    if (denied) return denied;
    let body: unknown;
    try { body = await request.json(); } catch { return badRequest(instance, "JSON tidak dapat diproses."); }

    const key = request.headers.get("Idempotency-Key") ?? "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) {
      return problemResponse({ status: 400, code: "BAD_REQUEST", title: "Permintaan tidak valid", detail: "Idempotency-Key harus berupa UUID.", instance });
    }
    const result = await createManagedUser(actor!.id, key, body);
    if (result.kind === "validation") return validationFailed(instance, result.errors);
    if (result.kind === "duplicate") return problemResponse({ status: 409, code: "EMAIL_ALREADY_USED", title: "Konflik data", detail: "Email tersebut sudah terdaftar.", instance });
    if (result.kind === "key_reused") return problemResponse({ status: 409, code: "IDEMPOTENCY_KEY_REUSED", title: "Konflik permintaan", detail: "Idempotency-Key telah digunakan untuk payload berbeda.", instance });
    return NextResponse.json({ user: result.user }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal membuat akun melalui admin", error);
    return internalError(instance);
  }
}
