import "dotenv/config"

import { prisma } from "../lib/prisma"
import { remediateDemoAccounts } from "./remediate-demo-core"

remediateDemoAccounts({
  databaseUrl: process.env.DATABASE_URL,
  compromisedPassword: process.env.COMPROMISED_DEMO_PASSWORD,
  args: process.argv.slice(2),
}, prisma)
  .then(({ audit, affectedCount, appliedCount, apply }) => {
    console.table(audit)
    console.log(`${affectedCount} akun cocok dengan kredensial demo yang bocor.`)
    if (appliedCount > 0) {
      console.log(`${appliedCount} akun dinonaktifkan, kata sandi diacak, dan sesi dicabut. Data terkait tetap disimpan.`)
    } else {
      console.log(apply
        ? "Tidak ada kecocokan; periksa nilai secret dan verifikasi login production."
        : "Audit saja; jalankan lagi dengan --apply setelah meninjau relasi data.")
    }
  })
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Remediasi akun demo gagal.")
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
