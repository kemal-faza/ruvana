import { prisma } from "@/lib/prisma";
import { AccountStatus, Role } from "@/generated/prisma/enums";

export function createPendingUser(nama: string, email: string, password: string) {
  return prisma.user.create({
    data: { nama, email, password, role: Role.pengguna, status: AccountStatus.PENDING },
    select: { id: true, nama: true, email: true, role: true, status: true, waktuDaftar: true, waktuVerifikasi: true },
  });
}

export function findUserForLogin(email: string) {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      nama: true,
      email: true,
      password: true,
      role: true,
      status: true,
      waktuDaftar: true,
      waktuVerifikasi: true,
    },
  });
}

export function findSessionUser(id: number) {
  return prisma.user.findUnique({
    where: { id },
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
}

export function createAuthSession(tokenHash: string, userId: number, expiresAt: Date) {
  return prisma.session.create({ data: { tokenHash, userId, expiresAt } });
}

export function findAuthSession(tokenHash: string) {
  return prisma.session.findUnique({
    where: { tokenHash },
    select: { userId: true, expiresAt: true },
  });
}

export function deleteAuthSession(tokenHash: string) {
  return prisma.session.deleteMany({ where: { tokenHash } });
}

export function findLoginAttempt(key: string) {
  return prisma.loginAttempt.findUnique({ where: { key } });
}

export async function storeLoginFailure(key: string, cutoff: Date): Promise<void> {
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

export function deleteLoginAttempts(key: string) {
  return prisma.loginAttempt.deleteMany({ where: { key } });
}
