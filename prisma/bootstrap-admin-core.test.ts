import bcrypt from "bcryptjs"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AccountStatus, Role } from "../generated/prisma/enums"
import type { prisma } from "../lib/prisma"
import { bootstrapAdmin, type BootstrapAdminInput } from "./bootstrap-admin-core"

const input: BootstrapAdminInput = {
  databaseUrl: "postgresql://localhost/ruvana",
  email: " Admin@Ruvana.Test ",
  name: " Admin Awal ",
  password: "sandi-admin-awal-yang-kuat",
}

const user = { findUnique: vi.fn(), create: vi.fn() }
const database = { user } as unknown as Pick<typeof prisma, "user">

beforeEach(() => {
  vi.clearAllMocks()
  user.findUnique.mockResolvedValue(null)
  user.create.mockResolvedValue({ id: 1 })
})

describe("bootstrapAdmin", () => {
  it.each([
    ["email tidak valid", { email: "admin-tanpa-domain" }, "BOOTSTRAP_ADMIN_EMAIL"],
    ["password kurang dari 16 byte", { password: "terlalu-pendek" }, "BOOTSTRAP_ADMIN_PASSWORD"],
    ["password lebih dari 72 byte", { password: "😀".repeat(19) }, "BOOTSTRAP_ADMIN_PASSWORD"],
  ])("menolak %s sebelum menulis", async (_name, override, message) => {
    await expect(bootstrapAdmin({ ...input, ...override }, database)).rejects.toThrow(message)
    expect(user.create).not.toHaveBeenCalled()
  })

  it("menolak email yang sudah terdaftar", async () => {
    user.findUnique.mockResolvedValue({ id: 5 })

    await expect(bootstrapAdmin(input, database)).rejects.toThrow("Email admin sudah terdaftar")
    expect(user.create).not.toHaveBeenCalled()
  })

  it("membuat admin aktif dengan email ternormalisasi dan hash password", async () => {
    await bootstrapAdmin(input, database)

    expect(user.findUnique).toHaveBeenCalledWith({ where: { email: "admin@ruvana.test" }, select: { id: true } })
    const { data } = user.create.mock.calls[0][0]
    expect(data).toMatchObject({
      email: "admin@ruvana.test",
      nama: "Admin Awal",
      role: Role.admin,
      status: AccountStatus.ACTIVE,
    })
    expect(data.password).not.toBe(input.password)
    expect(await bcrypt.compare(input.password!, data.password)).toBe(true)
  })
})
