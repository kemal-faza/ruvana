import type { TipeFasilitas } from "../generated/prisma/enums"

const PHOTO_BY_NAMA: Record<string, string> = {
  "Aula Utama": "/fasilitas/aula.jpeg",
  "Lab Kimia": "/fasilitas/lab-kimia.jpeg",
  "Lab Komputer 1": "/fasilitas/lab-komputer.jpeg",
  "Lapangan Basket": "/fasilitas/lapangan-basket.jpeg",
  "Lapangan Futsal": "/fasilitas/lapangan-futsal.jpeg",
  Proyektor: "/fasilitas/proyektor.jpeg",
  Speaker: "/fasilitas/speaker.jpeg",
}

const PHOTO_BY_TIPE: Partial<Record<TipeFasilitas, string>> = {
  ruang_kelas: "/fasilitas/ruang-kelas.jpeg",
  laboratorium: "/fasilitas/lab-komputer.jpeg",
}

export function getFacilityPhoto(nama: string, tipe: TipeFasilitas): string | null {
  return PHOTO_BY_NAMA[nama] ?? PHOTO_BY_TIPE[tipe] ?? null
}
