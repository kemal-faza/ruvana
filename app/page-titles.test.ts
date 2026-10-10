import { describe, expect, it } from "vitest"

import { metadata as forbiddenMetadata } from "./403/page"
import { metadata as adminAnalitikMetadata } from "./admin/analitik/page"
import { metadata as adminLayoutMetadata } from "./admin/layout"
import { metadata as adminPenggunaMetadata } from "./admin/pengguna/page"
import { metadata as baselineUiMetadata } from "./baseline-ui/page"
import { metadata as daftarMetadata } from "./daftar/page"
import { metadata as fasilitasMetadata } from "./fasilitas/page"
import { metadata as loginMetadata } from "./login/page"
import { metadata as petugasMetadata } from "./petugas/page"
import { metadata as antrianMetadata } from "./petugas/antrian/page"
import { metadata as pengaturanPetugasMetadata } from "./petugas/pengaturan/page"
import { metadata as reportsMetadata } from "./reports/page"
import { metadata as reservationMetadata } from "./reservasi/page"
import { metadata as reservationHistoryMetadata } from "./reservasi/riwayat/page"
import { metadata as reservationDetailMetadata } from "./reservasi/riwayat/[id]/page"

const metadataCases = [
  { route: "/login", actualTitle: loginMetadata.title, title: "Masuk | ruvana" },
  { route: "/daftar", actualTitle: daftarMetadata.title, title: "Daftar | ruvana" },
  { route: "/admin", actualTitle: adminLayoutMetadata.title, title: "Admin | ruvana" },
  { route: "/admin/analitik", actualTitle: adminAnalitikMetadata.title, title: "Analitik | ruvana" },
  { route: "/admin/pengguna", actualTitle: adminPenggunaMetadata.title, title: "Kelola pengguna | ruvana" },
  { route: "/fasilitas", actualTitle: fasilitasMetadata.title, title: "Fasilitas | ruvana" },
  { route: "/reports", actualTitle: reportsMetadata.title, title: "Laporan | ruvana" },
  { route: "/reservasi", actualTitle: reservationMetadata.title, title: "Ajukan reservasi | ruvana" },
  { route: "/reservasi/riwayat", actualTitle: reservationHistoryMetadata.title, title: "Reservasi | ruvana" },
  { route: "/reservasi/riwayat/[id]", actualTitle: reservationDetailMetadata.title, title: "Detail reservasi | ruvana" },
  { route: "/petugas", actualTitle: petugasMetadata.title, title: "Dashboard Petugas | ruvana" },
  { route: "/petugas/antrian", actualTitle: antrianMetadata.title, title: "Antrean reservasi | ruvana" },
  { route: "/petugas/pengaturan", actualTitle: pengaturanPetugasMetadata.title, title: "Pengaturan petugas | ruvana" },
  { route: "/403", actualTitle: forbiddenMetadata.title, title: "Akses ditolak | ruvana" },
  { route: "/baseline-ui", actualTitle: baselineUiMetadata.title, title: "Pratinjau komponen | ruvana" },
]

describe("metadata title halaman", () => {
  it.each(metadataCases)("$route memakai judul halaman diikuti brand", ({ actualTitle, title }) => {
    expect(actualTitle).toBe(title)
  })
})
