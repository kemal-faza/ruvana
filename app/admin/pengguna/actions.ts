"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { AccountStatus, Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type StateBuatAkun = {
  ok: boolean;
  pesan: string;
  fieldErrors?: Record<string, string[]>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;

export async function buatAkun(_prev: StateBuatAkun, form: FormData): Promise<StateBuatAkun> {
  const nama = String(form.get("nama") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const role = String(form.get("role") ?? "");

  const fieldErrors: Record<string, string[]> = {};
  if (nama.length < 3) fieldErrors.nama = ["Nama minimal 3 karakter."];
  if (!EMAIL_RE.test(email)) fieldErrors.email = ["Format email tidak valid."];
  if (password.length < 8 || !PASSWORD_RE.test(password)) {
    fieldErrors.password = ["Password minimal 8 karakter, mengandung huruf dan angka."];
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