import { createHash } from "node:crypto";
import { BATAS_LOGIN_GAGAL, JENDELA_LOGIN_MENIT } from "@/config/business";
import { deleteLoginAttempts, findLoginAttempt, storeLoginFailure } from "@/lib/db/auth";

export function loginAttemptKey(email: string, ip: string): string {
  return createHash("sha256").update(`${ip.toLowerCase()}\0${email}`).digest("hex");
}

export async function loginBlocked(key: string): Promise<boolean> {
  const attempt = await findLoginAttempt(key);
  if (!attempt) return false;
  const cutoff = Date.now() - JENDELA_LOGIN_MENIT * 60_000;
  return attempt.windowAt.getTime() > cutoff && attempt.failures >= BATAS_LOGIN_GAGAL;
}

export async function recordLoginFailure(key: string): Promise<void> {
  const cutoff = new Date(Date.now() - JENDELA_LOGIN_MENIT * 60_000);
  await storeLoginFailure(key, cutoff);
}

export async function clearLoginFailures(key: string): Promise<void> {
  await deleteLoginAttempts(key);
}
