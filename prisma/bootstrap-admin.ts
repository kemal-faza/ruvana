import "dotenv/config"

import { prisma } from "../lib/prisma"
import { bootstrapAdmin } from "./bootstrap-admin-core"

bootstrapAdmin({
  databaseUrl: process.env.DATABASE_URL,
  email: process.env.BOOTSTRAP_ADMIN_EMAIL,
  name: process.env.BOOTSTRAP_ADMIN_NAME,
  password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
}, prisma)
  .then(() => console.log("Akun admin awal dibuat. Simpan kredensial di pengelola secret, bukan di repo."))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Bootstrap admin gagal.")
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
