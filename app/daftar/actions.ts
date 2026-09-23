"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { AccountStatus, Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export type StateDaftar = {
  ok: boolean;
  pesan: string;
  fieldErrors?: Record<string, string[]>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function daftar(_prev: StateDaftar, form: FormData): Promise<StateDaftar> {
  const nama = String(form.get("nama") ?? "").trim();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const fieldErrors: Record<string, string[]> = {};

  if (!nama || nama.length > 100) fieldErrors.nama = ["Nama wajib diisi"];
  if (!EMAIL_RE.test(email) || email.length > 254) fieldErrors.email = ["Masukkan email yang valid."];
  const passwordBytes = Buffer.byteLength(password, "utf8");
  if (passwordBytes < 8 || passwordBytes > 72) fieldErrors.password = ["Kata sandi harus minimal berisi 8 karakter."];

  if (Object.keys(fieldErrors).length) {
    return { ok: false, pesan: "Periksa kembali isian formulir.", fieldErrors };
  }

  try {
    await prisma.user.create({
      data: {
        nama,
        email,
        password: await bcrypt.hash(password, 10),
        role: Role.pengguna,
        status: AccountStatus.PENDING,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, pesan: "Email sudah terdaftar.", fieldErrors: { email: ["Email sudah terdaftar."] } };
    }
    return { ok: false, pesan: "Pendaftaran gagal. Coba lagi." };
  }

  return { ok: true, pesan: "Pendaftaran berhasil. Tunggu persetujuan admin sebelum masuk." };
}
