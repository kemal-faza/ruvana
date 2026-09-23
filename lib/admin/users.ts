import { prisma } from "@/lib/prisma";
import { AccountStatus, Role } from "@/generated/prisma/enums";
import { requireAdmin } from "@/lib/auth";

export type AdminUserRow = {
  id: number;
  nama: string;
  email: string;
  role: Role;
  status: AccountStatus;
  waktuDaftar: Date;
  waktuVerifikasi: Date | null;
};

export type RingkasanAkun = {
  total: number;
  aktif: number;
  pending: number;
  dinonaktifkan: number;
};

export async function daftarPengguna(): Promise<{ users: AdminUserRow[]; ringkasan: RingkasanAkun }> {
  await requireAdmin();
  const [users, total, aktif, pending, dinonaktifkan] = await Promise.all([
    prisma.user.findMany({
      orderBy: { waktuDaftar: "desc" },
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        status: true,
        waktuDaftar: true,
        waktuVerifikasi: true,
      },
    }),
    prisma.user.count(),
    prisma.user.count({ where: { status: AccountStatus.ACTIVE } }),
    prisma.user.count({ where: { status: AccountStatus.PENDING } }),
    prisma.user.count({ where: { status: AccountStatus.DISABLED } }),
  ]);

  return {
    users,
    ringkasan: { total, aktif, pending, dinonaktifkan },
  };
}
