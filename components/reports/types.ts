export type StatusLaporan = "baru" | "diproses" | "selesai" | "ditolak";
export type StatusFasilitas = "aktif" | "dalam_perbaikan" | "nonaktif";
export type TipeFasilitas = "ruang_kelas" | "aula" | "laboratorium" | "alat" | "lapangan";

export interface Facility {
  id: number;
  nama: string;
  tipe: TipeFasilitas;
  lokasi: string;
  kapasitas: number;
  deskripsi?: string;
  status: StatusFasilitas;
}

export interface Report {
  id: number;
  userId: number;
  userName: string;
  facilityId: number;
  facilityName: string;
  kategori: string;
  deskripsi: string;
  foto: string | null;
  status: StatusLaporan;
  catatanResolusi: string | null;
  ditanganiOleh: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportFormData {
  facilityId: number | null;
  kategori: string;
  deskripsi: string;
  fotoFile: File | null;
}

export const KATEGORI_OPTIONS = [
  "Kerusakan Ringan",
  "Kerusakan Berat",
  "Pemeliharaan Rutin",
  "Kebutuhan Perbaikan Segera",
  "Lainnya",
] as const;

export const STATUS_LABELS: Record<StatusLaporan, string> = {
  baru: "Baru",
  diproses: "Diproses",
  selesai: "Selesai",
  ditolak: "Ditolak",
};

export const STATUS_FASILITAS_LABELS: Record<StatusFasilitas, string> = {
  aktif: "Aktif",
  dalam_perbaikan: "Dalam Perbaikan",
  nonaktif: "Nonaktif",
};
