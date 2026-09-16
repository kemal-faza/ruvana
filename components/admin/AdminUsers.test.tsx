import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import AdminUsers from "@/components/admin/AdminUsers"
import type { AdminUserRow } from "@/lib/admin/users"

vi.mock("@/app/admin/pengguna/actions", () => ({
  buatAkun: vi.fn(),
}))

const users: AdminUserRow[] = [
  {
    id: 1,
    nama: "Ayu Pratama",
    email: "ayu@kampus.ac.id",
    role: "pengguna",
    status: "ACTIVE",
    waktuDaftar: new Date("2026-09-01T08:00:00+07:00"),
    waktuVerifikasi: new Date("2026-09-02T08:00:00+07:00"),
  },
  {
    id: 2,
    nama: "Budi Santoso",
    email: "budi@kampus.ac.id",
    role: "petugas",
    status: "PENDING",
    waktuDaftar: new Date("2026-09-03T08:00:00+07:00"),
    waktuVerifikasi: null,
  },
  {
    id: 3,
    nama: "Citra Lestari",
    email: "citra@kampus.ac.id",
    role: "pengguna",
    status: "REJECTED",
    waktuDaftar: new Date("2026-09-04T08:00:00+07:00"),
    waktuVerifikasi: null,
  },
  {
    id: 4,
    nama: "Dedi Kurnia",
    email: "dedi@kampus.ac.id",
    role: "admin",
    status: "DISABLED",
    waktuDaftar: new Date("2026-09-05T08:00:00+07:00"),
    waktuVerifikasi: null,
  },
]

const ringkasan = { total: 4, aktif: 1, pending: 1, dinonaktifkan: 1 }

function renderFixture() {
  return render(<AdminUsers users={users} ringkasan={ringkasan} />)
}

afterEach(cleanup)

describe("AdminUsers (kelola akun)", () => {
  it("menampilkan ringkasan, tabel, dan badge status berbahasa Indonesia", () => {
    renderFixture()

    expect(screen.getByRole("heading", { level: 1, name: "Manajemen pengguna" })).toBeInTheDocument()
    expect(screen.getByText("Menampilkan 4 dari 4 akun.")).toBeInTheDocument()

    const tabel = screen.getByRole("table")
    for (const nama of ["Ayu Pratama", "Budi Santoso", "Citra Lestari", "Dedi Kurnia"]) {
      expect(within(tabel).getByText(nama)).toBeInTheDocument()
    }

    expect(within(tabel).getByText("Menunggu Verifikasi")).toBeInTheDocument()
    expect(within(tabel).getByText("Aktif")).toBeInTheDocument()
    expect(within(tabel).getByText("Ditolak")).toBeInTheDocument()
    expect(within(tabel).getByText("Dinonaktifkan")).toBeInTheDocument()
  })

  it("memfilter daftar dan menampilkan empty state saat tidak cocok", async () => {
    const user = userEvent.setup()
    renderFixture()

    await user.type(screen.getByLabelText("Cari nama atau email"), "tidak-ada-nama")
    expect(screen.getByText("Menampilkan 0 dari 4 akun.")).toBeInTheDocument()
    expect(screen.getByText("Tidak ada pengguna yang cocok")).toBeInTheDocument()
    expect(screen.queryByText("Ayu Pratama")).not.toBeInTheDocument()
  })

  it("membuka formulir buat akun dari Sheet saat tombol tambah ditekan", async () => {
    const user = userEvent.setup()
    renderFixture()

    await user.click(screen.getByRole("button", { name: "Tambah petugas / pengguna" }))

    const dialog = await screen.findByRole("dialog", { name: "Buat akun baru" })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/nama lengkap/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/email/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/password awal/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/role/i)).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Buat akun" })).toBeInTheDocument()
  })
})
