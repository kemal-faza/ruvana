import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { buatAkun } from "@/app/admin/pengguna/actions"
import AdminUsers from "@/components/admin/AdminUsers"
import type { AdminUserRow } from "@/lib/admin/users"

vi.mock("@/app/admin/pengguna/actions", () => ({
  buatAkun: vi.fn(),
  verifikasiPendaftaran: vi.fn(),
  ubahStatusAkun: vi.fn(),
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
    role: "pengguna",
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
  return render(<AdminUsers users={users} ringkasan={ringkasan} adminId={99} />)
}

afterEach(cleanup)

describe("AdminUsers (kelola akun)", () => {
  it("menampilkan ringkasan, tabel, dan badge status berbahasa Indonesia", () => {
    renderFixture()

    expect(screen.getByRole("heading", { level: 1, name: "Kelola pengguna" })).toBeInTheDocument()
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

  it("menampilkan keputusan verifikasi hanya untuk pengguna yang masih PENDING", () => {
    renderFixture()

    const barisPending = screen.getByText("Budi Santoso").closest("tr")
    expect(barisPending).not.toBeNull()
    expect(within(barisPending!).getByRole("button", { name: "Setujui" })).toBeInTheDocument()
    expect(within(barisPending!).getByRole("button", { name: "Tolak" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Setujui" })).toHaveLength(1)
  })

  it("menampilkan aksi nonaktifkan dan aktifkan kembali sesuai status akun", () => {
    renderFixture()

    const barisAktif = screen.getByText("Ayu Pratama").closest("tr")
    const barisNonaktif = screen.getByText("Dedi Kurnia").closest("tr")
    expect(barisAktif).not.toBeNull()
    expect(barisNonaktif).not.toBeNull()
    expect(within(barisAktif!).getByRole("button", { name: "Nonaktifkan" })).toBeInTheDocument()
    expect(within(barisNonaktif!).getByRole("button", { name: "Aktifkan kembali" })).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Nonaktifkan" })).toHaveLength(1)
  })

  it("melindungi akun admin yang sedang digunakan dari penonaktifan", () => {
    render(
      <AdminUsers
        users={[{ ...users[0], role: "admin" }]}
        ringkasan={{ total: 1, aktif: 1, pending: 0, dinonaktifkan: 0 }}
        adminId={1}
      />,
    )

    expect(screen.getByText("Akun Anda")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Nonaktifkan" })).not.toBeInTheDocument()
  })

  it("mencari berdasarkan email dan memfilter peran serta status", async () => {
    const user = userEvent.setup()
    renderFixture()

    await user.type(screen.getByLabelText("Cari nama atau email"), "citra@kampus.ac.id")
    expect(screen.getByText("Menampilkan 1 dari 4 akun.")).toBeInTheDocument()
    expect(screen.getByText("Citra Lestari")).toBeInTheDocument()

    await user.clear(screen.getByLabelText("Cari nama atau email"))
    await user.selectOptions(screen.getByLabelText("Filter peran"), "pengguna")
    await user.selectOptions(screen.getByLabelText("Filter status"), "REJECTED")
    expect(screen.getByText("Menampilkan 1 dari 4 akun.")).toBeInTheDocument()
    expect(screen.getByText("Citra Lestari")).toBeInTheDocument()
    expect(screen.queryByText("Ayu Pratama")).not.toBeInTheDocument()
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

    await user.click(screen.getByRole("button", { name: "Tambah akun" }))

    const dialog = await screen.findByRole("dialog", { name: "Buat akun baru" })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/nama lengkap/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/email/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/password awal/i)).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/peran/i)).toBeInTheDocument()
    expect(within(dialog).getByRole("button", { name: "Buat akun" })).toBeInTheDocument()
  })

  it("mencegah pengiriman password lebih dari 72 byte pada form admin", async () => {
    const user = userEvent.setup()
    renderFixture()
    await user.click(screen.getByRole("button", { name: "Tambah akun" }))

    const dialog = await screen.findByRole("dialog", { name: "Buat akun baru" })
    const nama = within(dialog).getByLabelText(/nama lengkap/i) as HTMLInputElement
    const email = within(dialog).getByLabelText(/email/i) as HTMLInputElement
    const password = within(dialog).getByLabelText(/password awal/i) as HTMLInputElement

    expect(nama).toHaveAttribute("maxlength", "100")
    expect(email).toHaveAttribute("maxlength", "254")
    await user.type(nama, "Siti Aminah")
    await user.type(email, "siti@kampus.ac.id")
    await user.type(password, `a1x${"é".repeat(35)}`)
    await user.selectOptions(within(dialog).getByLabelText(/peran/i), "pengguna")
    await user.click(within(dialog).getByRole("button", { name: "Buat akun" }))

    expect(password.validationMessage).toBe("Password maksimal 72 byte.")
    expect(buatAkun).not.toHaveBeenCalled()
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
        adminId={99}
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
