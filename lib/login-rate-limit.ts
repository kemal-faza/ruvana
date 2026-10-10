import { createHash } from "node:crypto";
import { BATAS_LOGIN_GAGAL, JENDELA_LOGIN_MENIT } from "@/config/business";
import { deleteLoginAttempts, reserveLoginAttemptSlot } from "@/lib/db/auth";

export function loginAttemptKey(email: string, ip: string): string {
  return createHash("sha256").update(`${ip.toLowerCase()}\0${email}`).digest("hex");
}

export async function reserveLoginAttempt(key: string): Promise<boolean> {
  return reserveLoginAttemptSlot(key, JENDELA_LOGIN_MENIT, BATAS_LOGIN_GAGAL);
}

export async function clearLoginFailures(key: string): Promise<void> {
  await deleteLoginAttempts(key);
}
