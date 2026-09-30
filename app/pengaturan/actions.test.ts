import { beforeEach, describe, expect, it, vi } from "vitest"

import bcrypt from "bcryptjs"
import { getCurrentSessionTokenHash, getSessionUser } from "@/lib/auth"
import { AccountStatus } from "@/generated/prisma/enums"
import {
  deleteOtherAuthSessions,
  findPasswordHashByUserId,
  updatePasswordAndRevokeOtherSessions,
  updateUserName,
} from "@/lib/db/auth"
import {
  changePasswordAction,
  revokeOtherSessionsAction,
  updateProfileAction,
} from "@/app/pengaturan/actions"

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/auth", () => ({
  getCurrentSessionTokenHash: vi.fn(),
  getSessionUser: vi.fn(),
}))
vi.mock("@/lib/db/auth", () => ({
  deleteOtherAuthSessions: vi.fn(),
  findPasswordHashByUserId: vi.fn(),
  updatePasswordAndRevokeOtherSessions: vi.fn(),
  updateUserName: vi.fn(),
}))
vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
}))

const account = {
  id: 12,
  nama: "Ayu Pratama",
  email: "ayu@kampus.ac.id",
  role: "pengguna" as const,
  status: AccountStatus.ACTIVE,
  waktuDaftar: new Date("2026-01-01T00:00:00Z"),
  waktuVerifikasi: null,
}

function form(values: Record<string, string>) {
  const data = new FormData()
  for (const [key, value] of Object.entries(values)) data.set(key, value)
  return data
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getSessionUser).mockResolvedValue(account)
  vi.mocked(getCurrentSessionTokenHash).mockResolvedValue("session-hash")
  vi.mocked(updateUserName).mockResolvedValue({ count: 1 } as never)
  vi.mocked(findPasswordHashByUserId).mockResolvedValue({ password: "stored-hash" } as never)
  vi.mocked(bcrypt.compare).mockImplementation(async (value, hash) => value === "password123" && hash === "stored-hash")
  vi.mocked(bcrypt.hash).mockResolvedValue("new-hash" as never)
  vi.mocked(updatePasswordAndRevokeOtherSessions).mockResolvedValue(1)
  vi.mocked(deleteOtherAuthSessions).mockResolvedValue({ count: 2 } as never)
})

describe("pengaturan profil dan keamanan", () => {
  it("menyimpan nama profil setelah validasi panjang", async () => {
    const result = await updateProfileAction({ ok: false, message: "" }, form({ nama: " Siti Aminah " }))

    expect(result).toEqual({ ok: true, message: "Profil berhasil diperbarui." })
    expect(updateUserName).toHaveBeenCalledWith(account.id, "Siti Aminah")
  })

  it("menolak nama terlalu pendek tanpa menulis ke database", async () => {
    const result = await updateProfileAction({ ok: false, message: "" }, form({ nama: "AB" }))

    expect(result.ok).toBe(false)
    expect(updateUserName).not.toHaveBeenCalled()
  })

  it("menolak kata sandi baru di bawah 8 byte sebelum cek kredensial", async () => {
    const result = await changePasswordAction(
      { ok: false, message: "" },
      form({ currentPassword: "password123", newPassword: "1234567", confirmation: "1234567" }),
    )

    expect(result.fieldErrors?.newPassword).toContain("8–72 byte UTF-8")
    expect(findPasswordHashByUserId).not.toHaveBeenCalled()
  })

  it("mengganti kata sandi dan mengakhiri sesi lain dengan sesi saat ini tetap aktif", async () => {
    const result = await changePasswordAction(
      { ok: false, message: "" },
      form({ currentPassword: "password123", newPassword: "password456", confirmation: "password456" }),
    )

    expect(result).toEqual({
      ok: true,
      message: "Kata sandi diperbarui. Sesi di perangkat lain telah diakhiri.",
    })
    expect(bcrypt.hash).toHaveBeenCalledWith("password456", 10)
    expect(updatePasswordAndRevokeOtherSessions).toHaveBeenCalledWith(account.id, "new-hash", "session-hash")
  })

  it("mengakhiri sesi lain tanpa menghapus sesi yang sedang digunakan", async () => {
    const result = await revokeOtherSessionsAction({ ok: false, message: "" }, new FormData())

    expect(result.message).toBe("Berhasil mengakhiri 2 sesi di perangkat lain.")
    expect(deleteOtherAuthSessions).toHaveBeenCalledWith(account.id, "session-hash")
  })
})
