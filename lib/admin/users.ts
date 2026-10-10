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

export async function daftarPengguna(): Promise<{ users: AdminUserRow[]; adminId: number }> {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({
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
  });

  return {
    users,
    adminId: admin.id,
  };
}
