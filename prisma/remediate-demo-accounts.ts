import "dotenv/config"
import { randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"

import { AccountStatus, Role } from "../generated/prisma/enums"
import { prisma } from "../lib/prisma"

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL wajib diisi.")
  const compromisedPassword = process.env.COMPROMISED_DEMO_PASSWORD
  if (!compromisedPassword) throw new Error("COMPROMISED_DEMO_PASSWORD wajib diisi untuk audit.")
  const apply = process.argv.includes("--apply")
  if (process.argv.some((arg) => arg.startsWith("--") && arg !== "--apply")) {
    throw new Error("Opsi yang didukung hanya --apply.")
  }

  const users = await prisma.user.findMany({
    select: { id: true, email: true, password: true, role: true, status: true },
  })
  const affected: typeof users = []
  for (const user of users) {
    if (await bcrypt.compare(compromisedPassword, user.password)) affected.push(user)
  }

  const audit = await Promise.all(affected.map(async (user) => ({
    email: user.email,
    role: user.role,
    status: user.status,
    reservasi: await prisma.reservation.count({ where: { userId: user.id } }),
    reservasiDiproses: await prisma.reservation.count({ where: { diprosesOleh: user.id } }),
    laporan: await prisma.report.count({ where: { userId: user.id } }),
    laporanDitangani: await prisma.report.count({ where: { ditanganiOleh: user.id } }),
    perubahanFasilitas: await prisma.facility.count({ where: { statusChangedById: user.id } }),
    sesiAktif: await prisma.session.count({ where: { userId: user.id, expiresAt: { gt: new Date() } } }),
  })))
  console.table(audit)
  console.log(`${affected.length} akun cocok dengan kredensial demo yang bocor.`)
  if (!apply || affected.length === 0) {
    console.log(apply
      ? "Tidak ada kecocokan; periksa nilai secret dan verifikasi login production."
      : "Audit saja; jalankan lagi dengan --apply setelah meninjau relasi data.")
    return
  }

  const affectedIds = new Set(affected.map((user) => user.id))
  const trustedAdmins = users.filter((user) =>
    user.role === Role.admin && user.status === AccountStatus.ACTIVE && !affectedIds.has(user.id),
  )
  if (trustedAdmins.length === 0) {
    throw new Error("Tidak ada admin aktif yang aman. Buat admin baru sebelum menonaktifkan akun demo.")
  }

  const rotated = await Promise.all(affected.map(async (user) => ({
    id: user.id,
    password: await bcrypt.hash(randomBytes(48).toString("base64url"), 12),
  })))
  await prisma.$transaction(async (tx) => {
    for (const user of rotated) {
      await tx.user.update({
        where: { id: user.id },
        data: { password: user.password, status: AccountStatus.DISABLED },
      })
      await tx.session.deleteMany({ where: { userId: user.id } })
    }
  })
  console.log(`${rotated.length} akun dinonaktifkan, kata sandi diacak, dan sesi dicabut. Data terkait tetap disimpan.`)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Remediasi akun demo gagal.")
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
