"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/auth";
import { AccountStatus, Role } from "@/generated/prisma/enums";

export type StateLogin = {
  ok: boolean;
  pesan: string;
  fieldErrors?: Record<string, string[]>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function login(
  prev: StateLogin,
  form: FormData
): Promise<StateLogin> {
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();

  const password = String(form.get("password") ?? "");

  // =========================
  // VALIDASI INPUT
  // =========================

  const fieldErrors: Record<string, string[]> = {};

  if (!email) {
    fieldErrors.email = ["Email wajib diisi."];
  } else if (!EMAIL_RE.test(email)) {
    fieldErrors.email = ["Format email tidak valid."];
  }

  if (!password) {
    fieldErrors.password = ["Password wajib diisi."];
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      pesan: "Periksa kembali isian formulir.",
      fieldErrors,
    };
  }

  // =========================
  // AMBIL USER
  // =========================

  let user;

  try {
    user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        status: true,
        password: true,
      },
    });
  } catch {
    return {
      ok: false,
      pesan: "Gagal terhubung. Coba lagi.",
    };
  }

  // =========================
  // CEK EMAIL & PASSWORD
  // =========================

  // Pesan dibuat generik supaya tidak membocorkan
  // apakah email tertentu terdaftar atau tidak.
  if (!user) {
    return {
      ok: false,
      pesan: "Email atau password salah.",
    };
  }

  let passwordCocok = false;

  try {
    passwordCocok = await bcrypt.compare(password, user.password);
  } catch {
    return {
      ok: false,
      pesan: "Email atau password salah.",
    };
  }

  if (!passwordCocok) {
    return {
      ok: false,
      pesan: "Email atau password salah.",
    };
  }

  // =========================
  // CEK STATUS AKUN
  // =========================

  if (user.status === AccountStatus.PENDING) {
    return {
      ok: false,
      pesan: "Akun masih menunggu verifikasi admin.",
    };
  }

  if (user.status !== AccountStatus.ACTIVE) {
    return {
      ok: false,
      pesan: "Akun tidak aktif.",
    };
  }

  // =========================
  // BUAT SESSION
  // =========================

  try {
    await createSession(user.id);
  } catch {
    return {
      ok: false,
      pesan: "Gagal membuat sesi login. Coba lagi.",
    };
  }

  // =========================
  // REDIRECT BERDASARKAN ROLE
  // =========================

  switch (user.role) {
    case Role.admin:
      redirect("/admin");

    case Role.petugas:
      redirect("/petugas");

    case Role.pengguna:
      redirect("/");

    default:
      // Pengaman tambahan jika ada role yang tidak dikenali.
      await destroySession();

      return {
        ok: false,
        pesan: "Role akun tidak valid.",
      };
  }
}

// =========================
// LOGOUT
// =========================

export async function logout() {
  await destroySession();
  redirect("/login");
}