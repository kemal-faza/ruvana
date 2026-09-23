"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession } from "@/lib/auth";
import { clearLoginFailures, loginAttemptKey, loginBlocked, recordLoginFailure } from "@/lib/login-rate-limit";
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

  const fieldErrors: Record<string, string[]> = {};

  if (!email) {
    fieldErrors.email = ["Email wajib diisi."];
  } else if (!EMAIL_RE.test(email) || email.length > 254) {
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

  let user;
  let key: string;

  try {
    key = await loginAttemptKey(email);
    if (await loginBlocked(key)) {
      return { ok: false, pesan: "Terlalu banyak percobaan masuk. Coba lagi dalam 15 menit." };
    }
    user = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
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

  let passwordCocok = false;
  if (user) {
    try {
      passwordCocok = await bcrypt.compare(password, user.password);
    } catch {
      passwordCocok = false;
    }
  }

  if (!user || !passwordCocok || user.status !== AccountStatus.ACTIVE) {
    try {
      await recordLoginFailure(key);
    } catch {
      return { ok: false, pesan: "Gagal terhubung. Coba lagi." };
    }
    return { ok: false, pesan: "Email atau kata sandi salah." };
  }

  try {
    await clearLoginFailures(key);
    await createSession(user.id);
  } catch {
    return {
      ok: false,
      pesan: "Gagal membuat sesi login. Coba lagi.",
    };
  }

  switch (user.role) {
    case Role.admin:
      redirect("/admin");

    case Role.petugas:
    case Role.pengguna:
      redirect("/");

    default:
      await destroySession();

      return {
        ok: false,
        pesan: "Gagal masuk. Coba lagi.",
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
