import bcrypt from "bcryptjs";
import { AccountStatus } from "@/generated/prisma/enums";
import { Prisma } from "@/generated/prisma/client";
import { BATAS_EMAIL_AKUN_KARAKTER, BATAS_NAMA_AKUN_KARAKTER, BATAS_PASSWORD_AKUN_BYTE } from "@/config/business";
import { createSession, destroySession, getSessionUser, type SessionAccount } from "@/lib/auth";
import { createPendingUser, findUserForLogin } from "@/lib/db/auth";
import { clearLoginFailures, loginAttemptKey, loginBlocked, recordLoginFailure } from "@/lib/login-rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function safeUser(user: SessionAccount) {
  return {
    id: user.id,
    nama: user.nama,
    email: user.email,
    role: user.role,
    status: user.status,
    waktuDaftar: user.waktuDaftar.toISOString(),
    waktuVerifikasi: user.waktuVerifikasi?.toISOString() ?? null,
  };
}

export type LoginResult =
  | { kind: "ok"; user: ReturnType<typeof safeUser>; expiresAt: string }
  | { kind: "validation"; errors: { field: string; code: string; message: string }[] }
  | { kind: "invalid" }
  | { kind: "rate_limited" };

export type RegisterResult =
  | { kind: "ok"; user: ReturnType<typeof safeUser> }
  | { kind: "validation"; errors: { field: string; code: string; message: string }[] }
  | { kind: "duplicate" };

export async function registerUser(body: unknown): Promise<RegisterResult> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { kind: "validation", errors: [{ field: "body", code: "INVALID_BODY", message: "Data pendaftaran tidak valid." }] };
  }
  const input = body as Record<string, unknown>;
  const nama = typeof input.nama === "string" ? input.nama.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const errors: { field: string; code: string; message: string }[] = [];
  if (!nama || nama.length > BATAS_NAMA_AKUN_KARAKTER) errors.push({ field: "nama", code: "NAME_INVALID", message: "Nama wajib diisi dan maksimal 100 karakter." });
  if (!EMAIL_RE.test(email) || email.length > BATAS_EMAIL_AKUN_KARAKTER) errors.push({ field: "email", code: "EMAIL_INVALID", message: "Format email tidak valid." });
  const passwordBytes = Buffer.byteLength(password, "utf8");
  if (passwordBytes < 8 || passwordBytes > BATAS_PASSWORD_AKUN_BYTE) errors.push({ field: "password", code: "PASSWORD_INVALID", message: "Kata sandi harus berukuran 8 sampai 72 byte UTF-8." });
  if (Object.keys(input).some((key) => !["nama", "email", "password"].includes(key))) errors.push({ field: "body", code: "UNKNOWN_FIELD", message: "Data pendaftaran tidak valid." });
  if (errors.length > 0) return { kind: "validation", errors };

  try {
    const user = await createPendingUser(nama, email, await bcrypt.hash(password, 10));
    return { kind: "ok", user: safeUser(user) };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { kind: "duplicate" };
    throw error;
  }
}

export async function loginWithCredentials(body: unknown, ip: string): Promise<LoginResult> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { kind: "validation", errors: [{ field: "body", code: "INVALID_BODY", message: "Data login tidak valid." }] };
  }
  const input = body as Record<string, unknown>;
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  const errors: { field: string; code: string; message: string }[] = [];
  if (!EMAIL_RE.test(email) || email.length > BATAS_EMAIL_AKUN_KARAKTER) {
    errors.push({ field: "email", code: "EMAIL_INVALID", message: "Format email tidak valid." });
  }
  if (!password) {
    errors.push({ field: "password", code: "PASSWORD_REQUIRED", message: "Kata sandi wajib diisi." });
  }
  if (Object.keys(input).some((key) => key !== "email" && key !== "password")) {
    errors.push({ field: "body", code: "UNKNOWN_FIELD", message: "Data login tidak valid." });
  }
  if (errors.length > 0) return { kind: "validation", errors };

  const key = loginAttemptKey(email, ip);
  if (await loginBlocked(key)) return { kind: "rate_limited" };

  const user = await findUserForLogin(email);
  let passwordCocok = false;
  const passwordBytes = Buffer.byteLength(password, "utf8");
  if (user && passwordBytes >= 8 && passwordBytes <= BATAS_PASSWORD_AKUN_BYTE) {
    try {
      passwordCocok = await bcrypt.compare(password, user.password);
    } catch {
      passwordCocok = false;
    }
  }
  if (!user || !passwordCocok || user.status !== AccountStatus.ACTIVE) {
    await recordLoginFailure(key);
    return { kind: "invalid" };
  }

  await clearLoginFailures(key);
  const expiresAt = await createSession(user.id);
  return {
    kind: "ok",
    user: safeUser(user),
    expiresAt: expiresAt.toISOString(),
  };
}

export async function currentAccount() {
  const user = await getSessionUser();
  return user ? safeUser(user) : null;
}

export async function logoutCurrentSession(): Promise<void> {
  await destroySession();
}
