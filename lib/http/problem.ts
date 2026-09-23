import { NextResponse } from "next/server";

export interface ProblemFieldError {
  field: string;
  code: string;
  message: string;
}

export interface ProblemOptions {
  status: number;
  code: string;
  title: string;
  detail: string;
  instance: string;
  errors?: ProblemFieldError[];
  // tambahan opsional untuk kasus konflik reservasi yang membawa availability
  availability?: unknown;
}

function toProblemType(code: string): string {
  const kebab = code.toLowerCase().replaceAll("_", "-");
  return `https://ruvana.invalid/problems/${kebab}`;
}

export function problemResponse({ status, code, title, detail, instance, errors, availability }: ProblemOptions) {
  const body: Record<string, unknown> = {
    type: toProblemType(code),
    title,
    status,
    detail,
    instance,
    code,
    ...(errors ? { errors } : {}),
    ...(availability !== undefined ? { availability } : {}),
  };
  return NextResponse.json(body, {
    status,
    headers: {
      "Content-Type": "application/problem+json",
      "Cache-Control": "no-store",
    },
  });
}

export function badRequest(instance: string, detail = "Permintaan tidak valid") {
  return problemResponse({
    status: 400,
    code: "BAD_REQUEST",
    title: "Permintaan tidak valid",
    detail,
    instance,
  });
}

export function unauthorized(instance: string, detail = "Sesi tidak valid atau akun tidak aktif.") {
  return problemResponse({
    status: 401,
    code: "UNAUTHORIZED",
    title: "Autentikasi diperlukan",
    detail,
    instance,
  });
}

export function forbidden(instance: string, detail = "Role akun tidak berwenang menjalankan operasi ini.") {
  return problemResponse({
    status: 403,
    code: "FORBIDDEN",
    title: "Akses ditolak",
    detail,
    instance,
  });
}

export function csrfOriginRejected(instance: string, detail = "Origin permintaan tidak diizinkan.") {
  return problemResponse({
    status: 403,
    code: "CSRF_ORIGIN_REJECTED",
    title: "Permintaan ditolak",
    detail,
    instance,
  });
}

export function notFound(instance: string, detail = "Resource tidak ditemukan") {
  return problemResponse({
    status: 404,
    code: "NOT_FOUND",
    title: "Resource tidak ditemukan",
    detail,
    instance,
  });
}

export function validationFailed(instance: string, errors: ProblemFieldError[]) {
  return problemResponse({
    status: 422,
    code: "VALIDATION_FAILED",
    title: "Validasi gagal",
    detail: "Satu atau lebih field tidak memenuhi aturan validasi",
    instance,
    errors,
  });
}

export function reservationOverlap(instance: string, detail: string, availability: unknown) {
  return problemResponse({
    status: 409,
    code: "RESERVATION_OVERLAP",
    title: "Reservasi bertabrakan",
    detail,
    instance,
    availability,
  });
}

export function invalidReservationTransition(instance: string, detail: string) {
  return problemResponse({
    status: 409,
    code: "INVALID_RESERVATION_TRANSITION",
    title: "Transisi reservasi tidak valid",
    detail,
    instance,
  });
}

export function idempotencyConflict(instance: string, detail = "Idempotency-Key telah digunakan untuk payload berbeda pada identity yang sama.") {
  return problemResponse({
    status: 409,
    code: "IDEMPOTENCY_KEY_REUSED",
    title: "Idempotensi tidak cocok",
    detail,
    instance,
  });
}

export function internalError(instance: string) {
  return problemResponse({
    status: 500,
    code: "INTERNAL_ERROR",
    title: "Kesalahan internal",
    detail: "Terjadi kesalahan yang tidak terduga, silakan coba lagi",
    instance,
  });
}
