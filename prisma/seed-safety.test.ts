import { describe, expect, it } from "vitest"

import { validateSeedConfig } from "./seed-safety"

const demoPassword = "sandi-demo-unik-untuk-lokal"

describe("validasi target seed", () => {
  it.each(["localhost", "127.0.0.1", "[::1]"])("menerima PostgreSQL lokal di %s", (host) => {
    expect(validateSeedConfig({
      databaseUrl: `postgresql://user:pass@${host}:5432/ruvana`,
      allowNonLocal: undefined,
      demoPassword,
    }).demoPassword).toBe(demoPassword)
  })

  it("menolak database non-lokal tanpa flag eksplisit", () => {
    expect(() => validateSeedConfig({
      databaseUrl: "postgresql://user:pass@db.example.test:5432/ruvana",
      allowNonLocal: undefined,
      demoPassword,
    })).toThrow("SEED_ALLOW_NON_LOCAL=1")
  })

  it("menerima database non-lokal hanya dengan flag eksplisit", () => {
    expect(validateSeedConfig({
      databaseUrl: "postgresql://user:pass@db.example.test:5432/ruvana",
      allowNonLocal: "1",
      demoPassword,
    }).databaseUrl).toContain("db.example.test")
  })

  it("menolak password kosong atau terlalu pendek", () => {
    expect(() => validateSeedConfig({
      databaseUrl: "postgresql://user:pass@localhost:5432/ruvana",
      allowNonLocal: undefined,
      demoPassword: "",
    })).toThrow("SEED_DEMO_PASSWORD")
  })
})
