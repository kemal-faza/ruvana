import { randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"

import { AccountStatus, Role } from "../generated/prisma/enums"
import type { prisma } from "../lib/prisma"

export interface RemediateDemoInput {
  databaseUrl?: string
  compromisedPassword?: string
  args: string[]
}

export function parseRemediationOptions(args: string[]): boolean {
  if (args.length === 0) return false
  if (args.length === 1 && args[0] === "--apply") return true
  throw new Error("Opsi yang didukung hanya --apply.")
}

export async function remediateDemoAccounts(input: RemediateDemoInput, database: typeof prisma) {
  if (!input.databaseUrl) throw new Error("DATABASE_URL wajib diisi.")
  if (!input.compromisedPassword) throw new Error("COMPROMISED_DEMO_PASSWORD wajib diisi untuk audit.")
  const apply = parseRemediationOptions(input.args)

  const users = await database.user.findMany({
    select: { id: true, email: true, password: true, role: true, status: true },
  })
  const affected: typeof users = []
  for (const user of users) {
    if (await bcrypt.compare(input.compromisedPassword, user.password)) affected.push(user)
  }

  const audit = await Promise.all(affected.map(async (user) => ({
    email: user.email,
    role: user.role,
    status: user.status,
    reservasi: await database.reservation.count({ where: { userId: user.id } }),
    reservasiDiproses: await database.reservation.count({ where: { diprosesOleh: user.id } }),
    laporan: await database.report.count({ where: { userId: user.id } }),
    laporanDitangani: await database.report.count({ where: { ditanganiOleh: user.id } }),
    perubahanFasilitas: await database.facility.count({ where: { statusChangedById: user.id } }),
    sesiAktif: await database.session.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } }),
  })))

  if (!apply || affected.length === 0) return { audit, affectedCount: affected.length, appliedCount: 0, apply }

  const affectedIds = new Set(affected.map((user) => user.id))
  const trustedAdmins = users.filter((user) =>
    user.role === Role.admin && user.status === AccountStatus.ACTIVE && !affectedIds.has(user.id),
  )
  if (trustedAdmins.length === 0) {
    throw new Error("Tidak ada admin aktif yang aman. Buat admin baru sebelum menonaktifkan akun demo.")
  }

  const rotated = await Promise.all(affected.map(async (user) => ({
    id: user.id,
    password: await bcrypt.hash(randomBytes(48).toString("base64url"), 10),
  })))
  await database.$transaction(async (tx) => {
    for (const user of rotated) {
      await tx.user.update({
        where: { id: user.id },
        data: { password: user.password, status: AccountStatus.DISABLED },
      })
      await tx.session.deleteMany({ where: { userId: user.id } })
    }
  })
  return { audit, affectedCount: affected.length, appliedCount: rotated.length, apply }
}
