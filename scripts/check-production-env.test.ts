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

  it("menjelaskan bahwa variabel bertipe Secret tidak terbaca saat rilis ditolak", () => {
    const run = spawnSync(process.execPath, [script], {
      env: { ...valid, DATABASE_URL: "" },
      encoding: "utf8",
    })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain("DATABASE_URL")
    expect(run.stderr).toContain("Config")
    expect(run.stderr).toContain("Secret")
  })

  it("menerima DATABASE_URL Prisma Postgres", () => {
    const output = execFileSync(process.execPath, [script], {
      env: { ...valid, DATABASE_URL: "prisma+postgres://accelerate.prisma-data.net/?api_key=contoh" },
      encoding: "utf8",
    })
    expect(output).toContain("Konfigurasi wajib Production tersedia")
  })

  it("menolak DATABASE_URL non-PostgreSQL", () => {
    const run = spawnSync(process.execPath, [script], {
      env: { ...valid, DATABASE_URL: "mysql://user:password@database.example.invalid:3306/ruvana" },
      encoding: "utf8",
    })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain("PostgreSQL")
  })

  it("menerima konfigurasi production lengkap", () => {
    const output = execFileSync(process.execPath, [script], { env: valid, encoding: "utf8" })
    expect(output).toContain("Konfigurasi wajib Production tersedia")
    expect(output).not.toContain(valid.CRON_SECRET)
  })

  it("menolak NEXT_PUBLIC_SITE_URL berupa alias *.vercel.app yang dilindungi", () => {
    const run = spawnSync(process.execPath, [script], {
      env: { ...valid, NEXT_PUBLIC_SITE_URL: "https://ruvana-kemal-fazas-projects.vercel.app" },
      encoding: "utf8",
    })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain("Deployment Protection")
    expect(run.stderr).toContain("domain kanonis")
  })

  it("menolak NEXT_PUBLIC_SITE_URL non-https dan alamat lokal", () => {
    const http = spawnSync(process.execPath, [script], {
      env: { ...valid, NEXT_PUBLIC_SITE_URL: "http://ruvana.example.invalid" },
      encoding: "utf8",
    })
    expect(http.status).toBe(1)
    expect(http.stderr).toContain("https")

    const lokal = spawnSync(process.execPath, [script], {
      env: { ...valid, NEXT_PUBLIC_SITE_URL: "https://localhost:3001" },
      encoding: "utf8",
    })
    expect(lokal.status).toBe(1)
    expect(lokal.stderr).toContain("alamat lokal")
  })

  it("menolak NEXT_PUBLIC_SITE_URL yang bukan URL", () => {
    const run = spawnSync(process.execPath, [script], {
      env: { ...valid, NEXT_PUBLIC_SITE_URL: "ruvana.example.invalid" },
      encoding: "utf8",
    })
    expect(run.status).toBe(1)
    expect(run.stderr).toContain("NEXT_PUBLIC_SITE_URL Production tidak valid")
  })
})
