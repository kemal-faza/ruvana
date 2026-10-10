import { spawnSync } from "node:child_process"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const script = resolve(process.cwd(), "scripts/apply-production-migrations.mjs")
const hostPooler = "ep-late-boat-b3h10sgm-pooler.c-4.ap-southeast-1.aws.neon.tech"
const hostDirect = "ep-late-boat-b3h10sgm.c-4.ap-southeast-1.aws.neon.tech"
const sandi = "sandi-produksi-rahasia"
const pooled = `postgresql://ruvana:${sandi}@${hostPooler}/neondb?sslmode=require`

function jalankan(env: Record<string, string | undefined>, argumen: string[] = ["--dry-run"]) {
  return spawnSync(process.execPath, [script, ...argumen], {
    env: { NODE_ENV: "test", ...env } as NodeJS.ProcessEnv,
    encoding: "utf8",
  })
}

describe("migrasi Production lewat host direct", () => {
  it("menurunkan host direct dari DATABASE_URL pooler tanpa mencetak kredensial", () => {
    const run = jalankan({ DATABASE_URL: pooled })

    expect(run.status).toBe(0)
    expect(run.stdout).toContain(hostDirect)
    expect(run.stdout).toContain("host direct diturunkan")
    expect(run.stdout).not.toContain(hostPooler)
    expect(run.stdout).not.toContain(sandi)
    expect(run.stderr).not.toContain(sandi)
  })

  it("mempertahankan bagian lain URL saat menurunkan host", () => {
    const run = jalankan({ DATABASE_URL: pooled })

    expect(run.stdout).toContain(`postgresql://ruvana:***@${hostDirect}/neondb?sslmode=require`)
  })

  it("memakai DATABASE_URL_UNPOOLED bila environment Production menyediakannya", () => {
    const run = jalankan({
      DATABASE_URL: pooled,
      DATABASE_URL_UNPOOLED: `postgresql://ruvana:${sandi}@${hostDirect}/neondb`,
    })

    expect(run.status).toBe(0)
    expect(run.stdout).toContain("DATABASE_URL_UNPOOLED")
    expect(run.stdout).toContain(hostDirect)
    expect(run.stdout).not.toContain(sandi)
  })

  it("mempertahankan database tanpa pooler apa adanya", () => {
    const run = jalankan({ DATABASE_URL: "postgresql://ruvana:sandi@database.example.invalid:5432/ruvana" })

    expect(run.status).toBe(0)
    expect(run.stdout).toContain("Migrasi memakai DATABASE_URL: database.example.invalid:5432")
  })

  it("memperingatkan bila host yang dipakai masih pooler", () => {
    const run = jalankan({ DATABASE_URL: pooled, DATABASE_URL_UNPOOLED: pooled })

    expect(run.status).toBe(0)
    expect(run.stderr).toContain("masih memakai pooler")
  })

  it("menolak migrasi tanpa DATABASE_URL", () => {
    const run = jalankan({})

    expect(run.status).toBe(1)
    expect(run.stderr).toContain("DATABASE_URL")
  })

  it("menolak URL database yang bukan PostgreSQL", () => {
    const run = jalankan({ DATABASE_URL: "mysql://ruvana:sandi@database.example.invalid:3306/ruvana" })

    expect(run.status).toBe(1)
    expect(run.stderr).toContain("PostgreSQL")
  })

  it("tidak menjalankan perintah migrasi pada mode uji", () => {
    const run = jalankan({ DATABASE_URL: pooled })

    expect(run.stdout).toContain("--dry-run")
    expect(run.stdout).toContain("tidak dijalankan")
  })
})
