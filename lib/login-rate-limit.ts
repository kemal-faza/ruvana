import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { BATAS_LOGIN_GAGAL, JENDELA_LOGIN_MENIT } from "@/config/business";
import { prisma } from "@/lib/prisma";

export async function loginAttemptKey(email: string): Promise<string> {
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-real-ip") ?? requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  return createHash("sha256").update(`${ip.toLowerCase()}\0${email}`).digest("hex");
}

export async function loginBlocked(key: string): Promise<boolean> {
  const attempt = await prisma.loginAttempt.findUnique({ where: { key } });
  if (!attempt) return false;
  const cutoff = Date.now() - JENDELA_LOGIN_MENIT * 60_000;
  return attempt.windowAt.getTime() > cutoff && attempt.failures >= BATAS_LOGIN_GAGAL;
}

export async function recordLoginFailure(key: string): Promise<void> {
  const cutoff = new Date(Date.now() - JENDELA_LOGIN_MENIT * 60_000);
  await prisma.$executeRaw`
    INSERT INTO "login_attempts" ("key", "failures", "windowAt")
    VALUES (${key}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT ("key") DO UPDATE SET
      "failures" = CASE WHEN "login_attempts"."windowAt" <= ${cutoff}
        THEN 1 ELSE "login_attempts"."failures" + 1 END,
      "windowAt" = CASE WHEN "login_attempts"."windowAt" <= ${cutoff}
        THEN CURRENT_TIMESTAMP ELSE "login_attempts"."windowAt" END
  `;
}

export async function clearLoginFailures(key: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key } });
}
