import "dotenv/config"
import bcrypt from "bcryptjs"

import { BATAS_EMAIL_AKUN_KARAKTER, BATAS_NAMA_AKUN_KARAKTER, BATAS_PASSWORD_AKUN_BYTE } from "../config/business"
import { AccountStatus, Role } from "../generated/prisma/enums"
import { prisma } from "../lib/prisma"

async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() ?? ""
  const nama = process.env.BOOTSTRAP_ADMIN_NAME?.trim() ?? ""
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? ""
  const passwordBytes = Buffer.byteLength(password, "utf8")

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL wajib diisi.")
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > BATAS_EMAIL_AKUN_KARAKTER) {
    throw new Error("BOOTSTRAP_ADMIN_EMAIL tidak valid.")
  }
  if (!nama || nama.length > BATAS_NAMA_AKUN_KARAKTER) throw new Error("BOOTSTRAP_ADMIN_NAME tidak valid.")
  if (passwordBytes < 16 || passwordBytes > BATAS_PASSWORD_AKUN_BYTE) {
    throw new Error(`BOOTSTRAP_ADMIN_PASSWORD wajib berukuran 16 sampai ${BATAS_PASSWORD_AKUN_BYTE} byte UTF-8.`)
  }
  if (await prisma.user.findUnique({ where: { email }, select: { id: true } })) {
    throw new Error("Email admin sudah terdaftar; bootstrap tidak mengubah akun yang ada.")
  }

  const hash = await bcrypt.hash(password, 12)
  await prisma.user.create({
    data: { email, nama, password: hash, role: Role.admin, status: AccountStatus.ACTIVE },
  })
  console.log("Akun admin awal dibuat. Simpan kredensial di pengelola secret, bukan di repo.")
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Bootstrap admin gagal.")
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
