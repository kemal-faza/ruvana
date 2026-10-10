import { BATAS_PASSWORD_AKUN_MIN_BYTE, BATAS_PASSWORD_AKUN_BYTE } from "../config/business"

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"])

export function validateSeedConfig(config: {
  databaseUrl: string | undefined
  allowNonLocal: string | undefined
  demoPassword: string | undefined
}) {
  if (!config.databaseUrl) throw new Error("DATABASE_URL wajib diisi sebelum seed.")

  let url: URL
  try {
    url = new URL(config.databaseUrl)
  } catch {
    throw new Error("DATABASE_URL tidak valid.")
  }
  if (!["postgresql:", "postgres:"].includes(url.protocol)) {
    throw new Error("Seed hanya mendukung database PostgreSQL.")
  }
  if (!LOCAL_HOSTS.has(url.hostname.toLowerCase()) && config.allowNonLocal !== "1") {
    throw new Error("Seed menolak database non-lokal. Set SEED_ALLOW_NON_LOCAL=1 hanya untuk lingkungan yang sudah diverifikasi.")
  }

  const passwordBytes = Buffer.byteLength(config.demoPassword ?? "", "utf8")
  if (passwordBytes < BATAS_PASSWORD_AKUN_MIN_BYTE || passwordBytes > BATAS_PASSWORD_AKUN_BYTE) {
    throw new Error(`SEED_DEMO_PASSWORD wajib berukuran ${BATAS_PASSWORD_AKUN_MIN_BYTE} sampai ${BATAS_PASSWORD_AKUN_BYTE} byte UTF-8.`)
  }

  return { databaseUrl: config.databaseUrl, demoPassword: config.demoPassword! }
}
