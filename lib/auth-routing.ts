import { Role } from "@/generated/prisma/enums";

export function getPostLoginPath(role: Role): string {
  if (role === Role.admin) return "/admin/analitik";
  if (role === Role.petugas) return "/petugas";
  return "/reservasi/riwayat";
}

/**
 * Memvalidasi tujuan kembali dari query `next` (mis. slot ketersediaan yang
 * diklik sebelum masuk). Hanya path relatif milik aplikasi ini yang diterima,
 * supaya `next` tidak bisa dipakai mengalihkan pengguna ke situs lain:
 * nilai absolut, protocol-relative (`//host`), backslash, dan karakter kontrol
 * ditolak.
 */
export function safeNextPath(raw: unknown): string | null {
  if (typeof raw !== "string" || raw === "") return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  if (raw.includes("\\")) return null;
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null;
  return raw;
}

/**
 * Tujuan setelah masuk. `next` hanya berlaku untuk pengguna: hanya peran itu
 * yang punya halaman publik yang bisa ditautkan dari luar (mis. /reservasi dari
 * slot ketersediaan fasilitas). Peran lain memakai dasbor masing-masing agar
 * tidak mendarat di /403.
 */
export function resolvePostLoginPath(role: Role, next?: unknown): string {
  if (role === Role.pengguna) {
    const tujuan = safeNextPath(next);
    if (tujuan !== null) return tujuan;
  }
  return getPostLoginPath(role);
}
