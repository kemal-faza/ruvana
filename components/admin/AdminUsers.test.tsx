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

const banyakPengguna: AdminUserRow[] = Array.from({ length: 12 }, (_, index) => ({
  id: 100 + index,
  nama: `Pengguna ${String(index + 1).padStart(2, "0")}`,
  email: `pengguna${index + 1}@kampus.ac.id`,
  role: "pengguna",
  status: "ACTIVE",
  waktuDaftar: new Date(`2026-09-${String(index + 1).padStart(2, "0")}T08:00:00+07:00`),
  waktuVerifikasi: null,
}))

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

  it("mengurutkan berdasarkan nama menaik lalu menurun", async () => {
    const user = userEvent.setup()
    renderFixture()

    const tombolUrut = screen.getByRole("button", { name: /urutkan berdasarkan pengguna/i })
    await user.click(tombolUrut)

    let baris = within(screen.getByRole("table")).getAllByRole("row")
    expect(baris[1]).toHaveTextContent("Ayu Pratama")

    await user.click(tombolUrut)

    baris = within(screen.getByRole("table")).getAllByRole("row")
    expect(baris[1]).toHaveTextContent("Dedi Kurnia")
  })

  it("memfilter tabel saat kartu ringkasan diklik dan melepas saat diklik lagi", async () => {
    const user = userEvent.setup()
    renderFixture()

    const kartuAktif = screen.getByRole("button", { name: "Aktif1" })
    expect(kartuAktif).toHaveAttribute("aria-pressed", "false")

    await user.click(kartuAktif)

    expect(kartuAktif).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByText("Menampilkan 1 dari 4 akun.")).toBeInTheDocument()
    expect(screen.getByText("Ayu Pratama")).toBeInTheDocument()
    expect(screen.queryByText("Budi Santoso")).not.toBeInTheDocument()

    await user.click(kartuAktif)

    expect(kartuAktif).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByText("Menampilkan 4 dari 4 akun.")).toBeInTheDocument()
  })

  it("membagi daftar menjadi beberapa halaman", async () => {
    const user = userEvent.setup()
    render(
      <AdminUsers
        users={banyakPengguna}
        ringkasan={{ total: 12, aktif: 12, pending: 0, dinonaktifkan: 0 }}
      />,
    )

    expect(screen.getByText("Menampilkan 12 dari 12 akun.")).toBeInTheDocument()
    expect(screen.getByText("Halaman 1 dari 2")).toBeInTheDocument()
    expect(screen.getByText("Pengguna 10")).toBeInTheDocument()
    expect(screen.queryByText("Pengguna 11")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Berikutnya" }))

    expect(screen.getByText("Halaman 2 dari 2")).toBeInTheDocument()
    expect(screen.getByText("Pengguna 11")).toBeInTheDocument()
    expect(screen.queryByText("Pengguna 01")).not.toBeInTheDocument()
  })
})
