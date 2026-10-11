import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { FacilityCatalog } from "@/components/facilities/facility-catalog"
import { Role } from "@/generated/prisma/enums"
import { getSessionUser } from "@/lib/auth"
import { getFacilityCatalog } from "@/lib/facilities/catalog"

export const dynamic = "force-dynamic"

const description =
  "Cari fasilitas kampus berdasarkan nama, tipe, lokasi, atau kapasitas."

export const metadata: Metadata = {
  title: "Fasilitas | ruvana",
  description,
  alternates: {
    canonical: "/fasilitas",
  },
  openGraph: {
    type: "website",
    title: "ruvana",
    description,
    url: "/fasilitas",
  },
}

interface FasilitasPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function FasilitasPage({ searchParams }: FasilitasPageProps) {
  const catalog = await getFacilityCatalog(await searchParams)
  if ("redirectQuery" in catalog) redirect(`/fasilitas?${catalog.redirectQuery}`)

  // Petugas dan admin tidak memesan dari halaman detail (di sana mereka hanya
  // melihat ketersediaan statis), jadi label aksi kartu tidak boleh menjanjikan
  // alur reservasi. Pengunjung anonim tetap boleh: slot mengarahkannya masuk
  // lebih dulu lalu kembali ke form pengajuan.
  const user = await getSessionUser()
  const canStartReservation = user === null || user.role === Role.pengguna

  return <FacilityCatalog {...catalog} basePath="/fasilitas" canStartReservation={canStartReservation} />
}
