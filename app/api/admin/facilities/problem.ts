import { problemResponse } from "@/lib/http/problem";

/**
 * Body problem dan helper replay bersama untuk seluruh route admin fasilitas,
 * supaya bentuk respons error tidak berbeda antar route.
 */

export function adminIdempotencyConflict(instance: string, kind: "different" | "pending") {
  return problemResponse({
    status: 409,
    code: "IDEMPOTENCY_KEY_REUSED",
    title: kind === "different" ? "Konflik permintaan" : "Permintaan sedang diproses",
    detail: kind === "different"
      ? "Idempotency-Key telah digunakan untuk payload berbeda."
      : "Permintaan dengan key yang sama sedang diproses, silakan ulangi.",
    instance,
  });
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

export function facilityHasHistory(instance: string) {
  return problemResponse({
    status: 409,
    code: "FACILITY_HAS_HISTORY",
    title: "Fasilitas memiliki riwayat",
    detail: "Fasilitas dengan riwayat tidak dapat dihapus permanen. Nonaktifkan fasilitas ini (status Nonaktif) sebagai gantinya.",
    instance,
  });
}
