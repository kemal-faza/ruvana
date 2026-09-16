// Session seam sementara — PLACEHOLDER hingga Modul 1 (Auth) tersedia.
// JANGAN anggap implementasi ini final. Signature stabil agar caller
// (mis. route handler reservasi) tidak perlu diubah saat Auth diganti.
// Modul Auth akan mengganti isi fungsi ini dengan verifikasi cookie
// ruvana_session, pengecekan status ACTIVE, dan load user terbaru.

import type { NextRequest } from "next/server";

export interface SessionUser {
  id: number;
  nama: string;
  email: string;
  role: "pengguna" | "petugas" | "admin";
  status: "PENDING" | "ACTIVE" | "REJECTED" | "DISABLED";
  waktuDaftar: string;
  waktuVerifikasi: string | null;
}

export interface Session {
  user: SessionUser;
  expiresAt: string;
}

/**
 * Mengambil sesi dari request.
 * Implementasi placeholder: mengembalikan null (dianggap belum login).
 * Auth (Modul 1) akan mengganti dengan verifikasi cookie HttpOnly
 * dan pengecekan status ACTIVE di server.
 */
export async function getSession(_request: NextRequest): Promise<Session | null> {
  void _request;
  // Placeholder — kembalikan null agar route handler mengembalikan 401 generik.
  // Contoh implementasi mendatang:
  // const cookie = _request.cookies.get("ruvana_session")?.value
  // if (!cookie) return null
  // const user = await verifySession(cookie) // cek DB + status ACTIVE
  // return user ? { user, expiresAt } : null
  return null;
}

/**
 * Helper untuk memeriksa role pengguna. Dipakai route handler untuk
 * membedakan 401 (non-ACTIVE / tanpa sesi) vs 403 (ACTIVE tapi role salah).
 */
export function isActivePengguna(session: Session | null): boolean {
  return session !== null && session.user.status === "ACTIVE" && session.user.role === "pengguna";
}
