import type { AdminUserRow } from "@/lib/admin/users";

export type RingkasanAkun = {
  total: number;
  aktif: number;
  pending: number;
  dinonaktifkan: number;
};

// Pemetaan status akun ke hitungan kartu ringkasan adalah aturan domain, bukan
// urusan tampilan: `total` mencakup semua status (termasuk REJECTED), sedangkan
// tiga hitungan lain hanya untuk status yang ditampilkan kartunya.
export function ringkasAkun(users: readonly Pick<AdminUserRow, "status">[]): RingkasanAkun {
  const ringkasan: RingkasanAkun = { total: users.length, aktif: 0, pending: 0, dinonaktifkan: 0 };
  for (const user of users) {
    if (user.status === "ACTIVE") ringkasan.aktif += 1;
    else if (user.status === "PENDING") ringkasan.pending += 1;
    else if (user.status === "DISABLED") ringkasan.dinonaktifkan += 1;
  }
  return ringkasan;
}
