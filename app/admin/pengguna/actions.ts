"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { AccountStatus, Role } from "@/generated/prisma/enums";
import {
  BATAS_EMAIL_AKUN_KARAKTER,
  BATAS_NAMA_AKUN_KARAKTER,
  BATAS_PASSWORD_AKUN_BYTE,
} from "@/config/business";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export type StateBuatAkun = {
  ok: boolean;
  pesan: string;
  fieldErrors?: Record<string, string[]>;
};

export type StateVerifikasiPendaftaran = {
  ok: boolean;
  pesan: string;
};

export type StateStatusAkun = {
  ok: boolean;
  pesan: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

export async function buatAkun(_prev: StateBuatAkun, form: FormData): Promise<StateBuatAkun> {
  const admin = await requireAdmin();
  const nama = String(form.get("nama") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const role = String(form.get("role") ?? "");

  const fieldErrors: Record<string, string[]> = {};
  if (nama.length < 3 || nama.length > BATAS_NAMA_AKUN_KARAKTER) {
    fieldErrors.nama = [`Nama harus berisi 3–${BATAS_NAMA_AKUN_KARAKTER} karakter.`];
  }
  if (!EMAIL_RE.test(email) || email.length > BATAS_EMAIL_AKUN_KARAKTER) {
    fieldErrors.email = ["Format email tidak valid atau terlalu panjang."];
  }
  if (password.length < 8 || !PASSWORD_RE.test(password)) {
    fieldErrors.password = ["Password minimal 8 karakter, mengandung huruf dan angka."];
  } else if (Buffer.byteLength(password, "utf8") > BATAS_PASSWORD_AKUN_BYTE) {
    fieldErrors.password = [`Password maksimal ${BATAS_PASSWORD_AKUN_BYTE} byte.`];
  }
  if (role !== "pengguna" && role !== "petugas") {
    fieldErrors.role = ["Role yang diizinkan: pengguna atau petugas."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, pesan: "Periksa kembali isian formulir.", fieldErrors };
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: {
        nama,
        email,
        password: passwordHash,
        role: role as Role,
        status: AccountStatus.ACTIVE,
        dibuatOleh: admin.id,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { ok: false, pesan: "Email sudah terdaftar. Gunakan email lain.", fieldErrors: { email: ["Email sudah terdaftar."] } };
    }
    return { ok: false, pesan: "Gagal menyimpan akun. Coba lagi." };
  }

  revalidatePath("/admin/pengguna");
  return { ok: true, pesan: "Akun berhasil dibuat." };
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
  try {
    const hasil = await prisma.user.updateMany({
      where: { id, role: Role.pengguna, status: AccountStatus.PENDING },
      data: {
        status: disetujui ? AccountStatus.ACTIVE : AccountStatus.REJECTED,
        ...(disetujui ? { waktuVerifikasi: new Date() } : {}),
      },
    });
    if (hasil.count !== 1) {
      return { ok: false, pesan: "Akun tidak lagi menunggu verifikasi." };
    }
  } catch {
    return { ok: false, pesan: "Gagal memverifikasi akun. Coba lagi." };
  }

  revalidatePath("/admin/pengguna");
  return { ok: true, pesan: disetujui ? "Akun berhasil disetujui." : "Pendaftaran ditolak." };
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

  revalidatePath("/admin/pengguna");
  return {
    ok: true,
    pesan: tindakan === "nonaktifkan" ? "Akun berhasil dinonaktifkan." : "Akun berhasil diaktifkan kembali.",
  };
}
