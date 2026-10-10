"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { AccountStatus, Role } from "@/generated/prisma/enums";
import {
  BATAS_EMAIL_AKUN_KARAKTER,
  BATAS_NAMA_AKUN_KARAKTER,
  BATAS_PASSWORD_AKUN_MIN_BYTE,
  BATAS_PASSWORD_AKUN_BYTE,
} from "@/config/business";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import type { AdminUserRow } from "@/lib/admin/users";

export type StateBuatAkun = {
  ok: boolean;
  pesan: string;
  fieldErrors?: Record<string, string[]>;
  user?: AdminUserRow;
};

export type StateVerifikasiPendaftaran = {
  ok: boolean;
  pesan: string;
  perubahan?: { id: number; status: AccountStatus; waktuVerifikasi: Date | null };
};

export type StateStatusAkun = {
  ok: boolean;
  pesan: string;
  perubahan?: { id: number; status: AccountStatus };
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function buatAkun(_prev: StateBuatAkun, form: FormData): Promise<StateBuatAkun> {
  const admin = await requireAdmin();
  const nama = String(form.get("nama") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const role = String(form.get("role") ?? "");

  const fieldErrors: Record<string, string[]> = {};
  if (!nama || nama.length > BATAS_NAMA_AKUN_KARAKTER) {
    fieldErrors.nama = [`Nama wajib diisi dan maksimal ${BATAS_NAMA_AKUN_KARAKTER} karakter.`];
  }
  if (!EMAIL_RE.test(email) || email.length > BATAS_EMAIL_AKUN_KARAKTER) {
    fieldErrors.email = ["Format email tidak valid atau terlalu panjang."];
  }
  const passwordBytes = Buffer.byteLength(password, "utf8");
  if (passwordBytes < BATAS_PASSWORD_AKUN_MIN_BYTE) {
    fieldErrors.password = [`Kata sandi minimal ${BATAS_PASSWORD_AKUN_MIN_BYTE} karakter.`];
  } else if (passwordBytes > BATAS_PASSWORD_AKUN_BYTE) {
    fieldErrors.password = [`Kata sandi maksimal ${BATAS_PASSWORD_AKUN_BYTE} karakter.`];
  }
  if (role !== "pengguna" && role !== "petugas") {
    fieldErrors.role = ["Role yang diizinkan: pengguna atau petugas."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, pesan: "Periksa kembali isian formulir.", fieldErrors };
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        nama,
        email,
        password: passwordHash,
        role: role as Role,
        status: AccountStatus.ACTIVE,
        dibuatOleh: admin.id,
      },
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
    return { ok: true, pesan: "Akun berhasil dibuat.", user };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, pesan: "Email sudah terdaftar. Gunakan email lain.", fieldErrors: { email: ["Email sudah terdaftar."] } };
    }
    return { ok: false, pesan: "Gagal menyimpan akun. Coba lagi." };
  }
}

export async function verifikasiPendaftaran(
  _prev: StateVerifikasiPendaftaran,
  form: FormData,
): Promise<StateVerifikasiPendaftaran> {
  await requireAdmin();

  const id = Number(form.get("id"));
  const keputusan = String(form.get("keputusan") ?? "");
  if (!Number.isSafeInteger(id) || id <= 0 || (keputusan !== "setujui" && keputusan !== "tolak")) {
    return { ok: false, pesan: "Permintaan verifikasi tidak valid." };
  }

  const disetujui = keputusan === "setujui";
  const waktuVerifikasi = disetujui ? new Date() : null;
  try {
    const hasil = await prisma.user.updateMany({
      where: { id, role: Role.pengguna, status: AccountStatus.PENDING },
      data: {
        status: disetujui ? AccountStatus.ACTIVE : AccountStatus.REJECTED,
        ...(disetujui ? { waktuVerifikasi } : {}),
      },
    });
    if (hasil.count !== 1) {
      return { ok: false, pesan: "Akun tidak lagi menunggu verifikasi." };
    }
  } catch {
    return { ok: false, pesan: "Gagal memverifikasi akun. Coba lagi." };
  }

  return {
    ok: true,
    pesan: disetujui ? "Akun berhasil disetujui." : "Pendaftaran ditolak.",
    perubahan: { id, status: disetujui ? AccountStatus.ACTIVE : AccountStatus.REJECTED, waktuVerifikasi },
  };
}

export async function ubahStatusAkun(
  _prev: StateStatusAkun,
  form: FormData,
): Promise<StateStatusAkun> {
  const admin = await requireAdmin();

  const id = Number(form.get("id"));
  const tindakan = String(form.get("tindakan") ?? "");
  if (!Number.isSafeInteger(id) || id <= 0 || (tindakan !== "nonaktifkan" && tindakan !== "aktifkan")) {
    return { ok: false, pesan: "Permintaan perubahan status tidak valid." };
  }
  if (tindakan === "nonaktifkan" && id === admin.id) {
    return { ok: false, pesan: "Akun admin yang sedang digunakan tidak dapat dinonaktifkan." };
  }

  const statusAwal = tindakan === "nonaktifkan" ? AccountStatus.ACTIVE : AccountStatus.DISABLED;
  const statusBaru = tindakan === "nonaktifkan" ? AccountStatus.DISABLED : AccountStatus.ACTIVE;

  try {
    const hasil = await prisma.$transaction(async (tx) => {
      const pembaruan = await tx.user.updateMany({
        where: { id, status: statusAwal },
        data: { status: statusBaru },
      });
      if (pembaruan.count === 1 && tindakan === "nonaktifkan") {
        await tx.session.deleteMany({ where: { userId: id } });
      }
      return pembaruan;
    });
    if (hasil.count !== 1) {
      return { ok: false, pesan: "Status akun telah berubah. Muat ulang daftar pengguna." };
    }
  } catch {
    return { ok: false, pesan: "Gagal mengubah status akun. Coba lagi." };
  }

  return {
    ok: true,
    pesan: tindakan === "nonaktifkan" ? "Akun berhasil dinonaktifkan." : "Akun berhasil diaktifkan kembali.",
    perubahan: { id, status: statusBaru },
  };
}
