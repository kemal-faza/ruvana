import bcrypt from "bcryptjs"
import { describe, expect, it, vi } from "vitest"

import { AccountStatus, Role } from "../generated/prisma/enums"
import type { prisma } from "../lib/prisma"
import { parseRemediationOptions, remediateDemoAccounts } from "./remediate-demo-core"

const compromisedPassword = "sandi-demo-yang-bocor"
const compromisedHash = bcrypt.hashSync(compromisedPassword, 4)
const trustedHash = bcrypt.hashSync("sandi-admin-terpercaya", 4)
const databaseUrl = "postgresql://localhost/ruvana"

type UserFixture = {
  id: number
  email: string
  password: string
  role: Role
  status: AccountStatus
}

function createDatabase(users: UserFixture[]) {
  const update = vi.fn().mockResolvedValue({})
  const deleteMany = vi.fn().mockResolvedValue({ count: 1 })
  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({
    user: { update },
    session: { deleteMany },
  }))
  const user = { findMany: vi.fn().mockResolvedValue(users), update }
  const db = {
    user,
    reservation: { count: vi.fn().mockResolvedValue(0) },
    report: { count: vi.fn().mockResolvedValue(0) },
    facility: { count: vi.fn().mockResolvedValue(0) },
    session: { count: vi.fn().mockResolvedValue(0), deleteMany },
    $transaction: transaction,
  } as unknown as typeof prisma
  return { db, user, update, deleteMany, transaction }
}

const affectedAdmin: UserFixture = {
  id: 1,
  email: "admin-demo@ruvana.test",
  password: compromisedHash,
  role: Role.admin,
  status: AccountStatus.ACTIVE,
}
const affectedPengguna: UserFixture = {
  id: 2,
  email: "pengguna-demo@ruvana.test",
  password: compromisedHash,
  role: Role.pengguna,
  status: AccountStatus.ACTIVE,
}
const trustedAdmin: UserFixture = {
  id: 3,
  email: "admin-aman@ruvana.test",
  password: trustedHash,
  role: Role.admin,
  status: AccountStatus.ACTIVE,
}

describe("remediasi akun demo", () => {
  it.each([["--dry-run"], ["positional"], ["--apply", "--apply"]])("menolak opsi selain --apply", (...args) => {
    expect(() => parseRemediationOptions(args)).toThrow("Opsi yang didukung hanya --apply")
  })

  it("mode audit hanya membaca dan tidak menulis", async () => {
    const { db, user, update, deleteMany, transaction } = createDatabase([affectedPengguna, trustedAdmin])

    const result = await remediateDemoAccounts({ databaseUrl, compromisedPassword, args: [] }, db)

    expect(result).toMatchObject({ affectedCount: 1, appliedCount: 0, apply: false })
    expect(result.audit).toHaveLength(1)
    expect(user.findMany).toHaveBeenCalledOnce()
    expect(transaction).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(deleteMany).not.toHaveBeenCalled()
  })

  it("--apply berhenti ketika tidak ada admin aktif di luar akun terdampak", async () => {
    const { db, transaction, update, deleteMany } = createDatabase([affectedAdmin, affectedPengguna])

    await expect(remediateDemoAccounts({ databaseUrl, compromisedPassword, args: ["--apply"] }, db))
      .rejects.toThrow("Tidak ada admin aktif yang aman")
    expect(transaction).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(deleteMany).not.toHaveBeenCalled()
  })

  it("--apply mengacak password, menonaktifkan akun, dan mencabut sesi dalam satu transaksi", async () => {
    const { db, update, deleteMany, transaction } = createDatabase([affectedAdmin, affectedPengguna, trustedAdmin])

    const result = await remediateDemoAccounts({ databaseUrl, compromisedPassword, args: ["--apply"] }, db)

    expect(result).toMatchObject({ affectedCount: 2, appliedCount: 2, apply: true })
    expect(transaction).toHaveBeenCalledOnce()
    expect(update).toHaveBeenCalledTimes(2)
    expect(deleteMany).toHaveBeenCalledTimes(2)
    expect(update.mock.calls.map(([args]) => args.where.id)).toEqual([1, 2])
    for (const [args] of update.mock.calls) {
      expect(args.data.status).toBe(AccountStatus.DISABLED)
      expect(await bcrypt.compare(compromisedPassword, args.data.password)).toBe(false)
    }
    expect(deleteMany.mock.calls.map(([args]) => args.where.userId)).toEqual([1, 2])
  })
})
