import { NextRequest, NextResponse } from "next/server";
import { AccountStatus, Role } from "@/generated/prisma/enums";
import { currentAccount } from "@/lib/services/auth-service";
import { badRequest, internalError, problemResponse, validationFailed } from "@/lib/http/problem";
import { originError } from "@/lib/http/origin";
import { buildIdempotencyScope, hashCanonicalBody } from "@/lib/http/idempotency";
import { claimIdempotentRoute, readIdempotencyKey } from "@/lib/http/idempotent-route";
import { createManagedUser, getManagedUsers } from "@/lib/services/admin-users-service";

const roles = Object.values(Role);
const statuses = Object.values(AccountStatus);
const CREATE_USER_SCOPE = buildIdempotencyScope("POST", "/api/admin/users");

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
  try {
    const actor = await currentAccount();
    const denied = accessDenied(instance, actor?.role);
    if (denied) return denied;

    const rejected = originError(request);
    if (rejected) return rejected;
    const key = readIdempotencyKey(request, instance);
    if (key instanceof NextResponse) return key;

    let body: unknown;
    try { body = await request.json(); } catch { return badRequest(instance, "JSON tidak dapat diproses."); }

    const idempotency = await claimIdempotentRoute({
      key,
      principalId: actor!.id,
      scope: CREATE_USER_SCOPE,
      requestHash: hashCanonicalBody(body),
      instance,
    });
    if (idempotency instanceof NextResponse) return idempotency;

    let result: Awaited<ReturnType<typeof createManagedUser>>;
    try {
      result = await createManagedUser(actor!.id, body, async (tx, user) => {
        await idempotency.commit(tx, 201, { user });
      });
    } catch (error) {
      console.error("Gagal membuat akun melalui admin", error);
      return idempotency.fail();
    }
    if (result.kind === "validation") return idempotency.settle(validationFailed(instance, result.errors));
    if (result.kind === "duplicate") return idempotency.settle(problemResponse({ status: 409, code: "EMAIL_ALREADY_USED", title: "Konflik data", detail: "Email tersebut sudah terdaftar.", instance }));
    return NextResponse.json({ user: result.user }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gagal membuat akun melalui admin", error);
    return internalError(instance);
  }
}
