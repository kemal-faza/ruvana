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

export function findPasswordHashByUserId(id: number) {
  return prisma.user.findUnique({ where: { id }, select: { password: true } });
}

export function updateUserName(id: number, nama: string) {
  return prisma.user.updateMany({
    where: { id, status: AccountStatus.ACTIVE },
    data: { nama },
  });
}

export async function updatePasswordAndRevokeOtherSessions(
  userId: number,
  password: string,
  currentTokenHash: string,
) {
  return prisma.$transaction(async (tx) => {
    const update = await tx.user.updateMany({
      where: { id: userId, status: AccountStatus.ACTIVE },
      data: { password },
    });
    if (update.count === 1) {
      await tx.session.deleteMany({
        where: { userId, tokenHash: { not: currentTokenHash } },
      });
    }
    return update.count;
  });
}

export function deleteOtherAuthSessions(userId: number, currentTokenHash: string) {
  return prisma.session.deleteMany({
    where: { userId, tokenHash: { not: currentTokenHash } },
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

// Reservasi slot dan pemeriksaan batas berjalan dalam satu upsert PostgreSQL.
// Baris dengan key sama dikunci oleh ON CONFLICT sehingga request serentak
// tidak dapat melewati batas sebelum pemeriksaan kata sandi selesai.
export async function reserveLoginAttemptSlot(key: string, windowMinutes: number, limit: number): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ failures: number }>>`
    INSERT INTO "login_attempts" ("key", "failures", "windowAt")
    VALUES (${key}, 1, LOCALTIMESTAMP)
    ON CONFLICT ("key") DO UPDATE SET
      "failures" = CASE WHEN "login_attempts"."windowAt" <= LOCALTIMESTAMP - (${windowMinutes} * INTERVAL '1 minute')
        THEN 1 ELSE "login_attempts"."failures" + 1 END,
      "windowAt" = CASE WHEN "login_attempts"."windowAt" <= LOCALTIMESTAMP - (${windowMinutes} * INTERVAL '1 minute')
        THEN LOCALTIMESTAMP ELSE "login_attempts"."windowAt" END
    WHERE "login_attempts"."windowAt" <= LOCALTIMESTAMP - (${windowMinutes} * INTERVAL '1 minute')
       OR "login_attempts"."failures" < ${limit}
    RETURNING "failures"
  `;
  return rows.length === 1;
}

export function deleteLoginAttempts(key: string) {
  return prisma.loginAttempt.deleteMany({ where: { key } });
}
