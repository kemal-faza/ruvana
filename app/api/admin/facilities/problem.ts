import { storeIdempotencyResult } from "@/lib/db/idempotency";
import { problemResponse } from "@/lib/http/problem";

type IdempotencyIdentity = Parameters<typeof storeIdempotencyResult>[0];

/**
 * Body problem dan helper replay bersama untuk seluruh route admin fasilitas,
 * supaya bentuk respons error tidak berbeda antar route.
 */

/** Simpan hasil replay untuk jalur error tanpa menggagalkan respons. */
export async function storeBestEffort(
  identity: IdempotencyIdentity,
  status: number,
  body: unknown,
): Promise<void> {
  try {
    await storeIdempotencyResult(identity, { responseStatus: status, responseBody: body });
  } catch {
    // Replay bersifat best-effort; respons tetap dikembalikan.
  }
}

export function duplicateName(instance: string) {
  return problemResponse({
    status: 409,
    code: "FACILITY_NAME_ALREADY_USED",
    title: "Nama fasilitas sudah digunakan",
    detail: "Nama fasilitas harus unik.",
    instance,
  });
}

export function validationFailedBody(instance: string, errors: unknown) {
  return {
    type: "https://ruvana.invalid/problems/validation-failed",
    title: "Validasi gagal",
    status: 422,
    detail: "Satu atau lebih field tidak memenuhi aturan validasi",
    instance,
    code: "VALIDATION_FAILED",
    errors,
  };
}

export function notFoundBody(instance: string, detail: string) {
  return {
    type: "https://ruvana.invalid/problems/not-found",
    title: "Resource tidak ditemukan",
    status: 404,
    detail,
    instance,
    code: "NOT_FOUND",
  };
}

export function transitionBody(instance: string, detail: string) {
  return {
    type: "https://ruvana.invalid/problems/invalid-facility-transition",
    title: "Transisi fasilitas tidak valid",
    status: 409,
    detail,
    instance,
    code: "INVALID_FACILITY_TRANSITION",
  };
}

export function duplicateNameBody(instance: string) {
  return {
    type: "https://ruvana.invalid/problems/facility-name-already-used",
    title: "Nama fasilitas sudah digunakan",
    status: 409,
    detail: "Nama fasilitas harus unik.",
    instance,
    code: "FACILITY_NAME_ALREADY_USED",
  };
}
