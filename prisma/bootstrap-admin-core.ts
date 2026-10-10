import bcrypt from "bcryptjs"

import { BATAS_EMAIL_AKUN_KARAKTER, BATAS_NAMA_AKUN_KARAKTER, BATAS_PASSWORD_AKUN_MIN_BYTE, BATAS_PASSWORD_AKUN_BYTE } from "../config/business"
import { AccountStatus, Role } from "../generated/prisma/enums"
import type { prisma } from "../lib/prisma"

export interface BootstrapAdminInput {
  databaseUrl?: string
  email?: string
  name?: string
  password?: string
}

export async function bootstrapAdmin(input: BootstrapAdminInput, database: Pick<typeof prisma, "user">) {
  const email = input.email?.trim().toLowerCase() ?? ""
  const nama = input.name?.trim() ?? ""
  const password = input.password ?? ""
  const passwordBytes = Buffer.byteLength(password, "utf8")

  if (!input.databaseUrl) throw new Error("DATABASE_URL wajib diisi.")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > BATAS_EMAIL_AKUN_KARAKTER) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL tidak valid.")
  }
  if (!nama || nama.length > BATAS_NAMA_AKUN_KARAKTER) throw new Error("BOOTSTRAP_ADMIN_NAME tidak valid.")
  if (passwordBytes < BATAS_PASSWORD_AKUN_MIN_BYTE || passwordBytes > BATAS_PASSWORD_AKUN_BYTE) {
    throw new Error(`BOOTSTRAP_ADMIN_PASSWORD wajib berukuran ${BATAS_PASSWORD_AKUN_MIN_BYTE} sampai ${BATAS_PASSWORD_AKUN_BYTE} byte UTF-8.`)
  }
  if (await database.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new Error("Email admin sudah terdaftar; bootstrap tidak mengubah akun yang ada.")
  }

  const hash = await bcrypt.hash(password, 10)
  await database.user.create({
    data: { email, nama, password: hash, role: Role.admin, status: AccountStatus.ACTIVE },
  })
}
