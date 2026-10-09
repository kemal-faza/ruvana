import { execFileSync, spawnSync } from "node:child_process"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const script = resolve(process.cwd(), "scripts/check-production-env.mjs")
const valid = {
  NODE_ENV: "test" as const,
  DATABASE_URL: "postgresql://user:password@database.example.invalid:5432/ruvana",
  BLOB_READ_WRITE_TOKEN: "contoh-token",
  NEXT_PUBLIC_SITE_URL: "https://ruvana.example.invalid",
  ALLOWED_ORIGINS: "https://ruvana.example.invalid",
  CRON_SECRET: "contoh-kunci-cron-panjang-1234567890123456",
}

describe("prasyarat Production", () => {
  it("menolak rilis bila CRON_SECRET kosong tanpa membocorkan secret lain", () => {
    const run = spawnSync(process.execPath, [script], {
      env: { ...valid, CRON_SECRET: "" },
      encoding: "utf8",
    })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain("CRON_SECRET")
    expect(run.stderr).not.toContain(valid.DATABASE_URL)
  })

  it("menerima konfigurasi production lengkap", () => {
    const output = execFileSync(process.execPath, [script], { env: valid, encoding: "utf8" })
    expect(output).toContain("Konfigurasi wajib Production tersedia")
    expect(output).not.toContain(valid.CRON_SECRET)
  })
})
