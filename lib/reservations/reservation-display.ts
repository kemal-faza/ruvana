// Presenter siap-tampil untuk UI Reservasi dan Persetujuan Reservasi (Tahap 2).
// Modul murni tanpa Prisma: aman dipakai Server Component, route handler,
// maupun Client Component. Satu-satunya sumber label status adalah
// LABEL_STATUS_RESERVASI di config/labels.ts — jangan membuat pemetaan baru.
// Kontrak API lama tidak diubah; presenter hanya menurunkan string tampilan
// dari DTO yang sudah ada agar komponen client merender istilah domain.

import {
  STATUS_RESERVASI_DISETUJUI,
  STATUS_RESERVASI_MENUNGGU,
} from "@/config/business";
import {
  BADGE_STATUS_RESERVASI,
  LABEL_STATUS_RESERVASI,
  LABEL_TIPE_FASILITAS,
} from "@/config/labels";
import type { StatusReservasi, TipeFasilitas } from "@/generated/prisma/enums";

const ZONA_JAKARTA = "Asia/Jakarta";

export interface MasukanTampilanReservasi {
  status: string;
  date: string;
  startTime: string;
  endTime: string;
  submittedAt: string;
  processedAt: string | null;
}

export type VarianBadgeReservasi = (typeof BADGE_STATUS_RESERVASI)[StatusReservasi];

export interface TampilanReservasi {
  labelStatus: string;
  varianStatus: VarianBadgeReservasi;
  tanggal: string;
  waktu: string;
  diajukanPada: string;
  diprosesPada: string;
}

// Nama field teknis (kontrak API) ke istilah domain untuk pesan galat.
const LABEL_FIELD: Record<string, string> = {
  facilityId: "Fasilitas",
  date: "Tanggal",
  startTime: "Jam mulai",
  endTime: "Jam selesai",
  tujuanPenggunaan: "Tujuan",
  alasan: "Alasan",
  status: "Status",
  body: "Formulir",
};

// Pola teknis yang tidak boleh lolos ke pengguna: enum UPPER_SNAKE dan
// nama field/kunci objek internal.
const POLA_TEKNIS = /[A-Z]{2,}(?:_[A-Z0-9]+)+/;
const KUNCI_INTERNAL = [
  "facilityId",
  "startTime",
  "endTime",
  "tujuanPenggunaan",
  "submittedAt",
  "processedAt",
  "Availability",
  "availability",
  "slots",
];

const PESAN_KONFLIK =
  "Slot yang Anda pilih bertabrakan dengan reservasi yang telah disetujui. Pilih slot lain yang masih tersedia.";
const PESAN_GAGAL_UMUM = "Gagal memproses permintaan. Silakan coba lagi.";

function awalanUntuk(iso: string | null): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: ZONA_JAKARTA,
  }).format(new Date(iso));
}

export function formatTanggalSingkat(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1),
  );
}

export function formatRentangWaktu(startTime: string, endTime: string): string {
  return `${startTime}–${endTime}`;
}

// Memvalidasi status API lalu menurunkan nilai siap-tampil. Enum teknis
// hanya dipakai sebagai kunci label/varian dan tidak diteruskan ke View.
function statusReservasi(value: string): StatusReservasi {
  if (Object.prototype.hasOwnProperty.call(LABEL_STATUS_RESERVASI, value)) {
    return value as StatusReservasi;
  }
  throw new Error("Status reservasi tidak dikenal.");
}

export function tampilanReservasi(masukan: MasukanTampilanReservasi): TampilanReservasi {
  const status = statusReservasi(masukan.status);
  return {
    labelStatus: LABEL_STATUS_RESERVASI[status],
    varianStatus: BADGE_STATUS_RESERVASI[status],
    tanggal: formatTanggalSingkat(masukan.date),
    waktu: formatRentangWaktu(masukan.startTime, masukan.endTime),
    diajukanPada: awalanUntuk(masukan.submittedAt),
    diprosesPada: awalanUntuk(masukan.processedAt),
  };
}

export interface MasukanTampilanDetailReservasi extends MasukanTampilanReservasi {
  facility: { nama: string; tipe: string; lokasi: string };
  tujuanPenggunaan: string;
  alasan: string | null;
}

export interface TampilanDetailReservasi extends TampilanReservasi {
  namaFasilitas: string;
  ringkasanFasilitas: string;
  tujuan: string;
  alasan: string | null;
  dapatDibatalkan: boolean;
}

export function tampilanDetailReservasi(
  masukan: MasukanTampilanDetailReservasi,
): TampilanDetailReservasi {
  const status = statusReservasi(masukan.status);
  const labelTipe = LABEL_TIPE_FASILITAS[masukan.facility.tipe as TipeFasilitas];
  if (!labelTipe) throw new Error("Tipe fasilitas tidak dikenal.");

  return {
    ...tampilanReservasi(masukan),
    namaFasilitas: masukan.facility.nama,
    ringkasanFasilitas: `${labelTipe} · ${masukan.facility.lokasi}`,
    tujuan: masukan.tujuanPenggunaan,
    alasan: masukan.alasan,
    dapatDibatalkan:
      status === STATUS_RESERVASI_MENUNGGU || status === STATUS_RESERVASI_DISETUJUI,
  };
}

export interface GalatFieldTampil {
  idKontrol: "jam-mulai" | "jam-selesai" | "tujuan" | null;
  label: string;
}

// Nama field teknis dari galat validasi server ke kontrol form dan istilah
// domain. Field tanpa kontrol (fasilitas, tanggal) tetap dilaporkan lewat
// ringkasan dengan idKontrol null.
const FIELD_KE_KONTROL: Record<string, GalatFieldTampil> = {
  facilityId: { idKontrol: null, label: "Fasilitas" },
  date: { idKontrol: null, label: "Tanggal" },
  startTime: { idKontrol: "jam-mulai", label: "Jam mulai" },
  endTime: { idKontrol: "jam-selesai", label: "Jam selesai" },
  tujuanPenggunaan: { idKontrol: "tujuan", label: "Tujuan" },
  alasan: { idKontrol: null, label: "Alasan" },
};

export function petakanGalatField(errors: unknown): GalatFieldTampil[] {
  if (!Array.isArray(errors)) return [];
  const hasil: GalatFieldTampil[] = [];
  for (const item of errors as { field?: unknown }[]) {
    const pemetaan =
      typeof item?.field === "string" ? FIELD_KE_KONTROL[item.field] : undefined;
    if (pemetaan && !hasil.some((h) => h.label === pemetaan.label)) {
      hasil.push({ ...pemetaan });
    }
  }
  return hasil;
}

// Pesan sukses pengajuan memakai label domain "Menunggu" tanpa enum,
// id teknis, atau dump JSON.
export function pesanSuksesPengajuan(): string {
  return "Reservasi Anda tercatat sebagai Menunggu. Pantau perkembangannya di Reservasi Saya.";
}

interface GalatField {
  field?: unknown;
}

function labelUntukField(field: unknown): string | null {
  if (typeof field !== "string") return null;
  return LABEL_FIELD[field] ?? null;
}

// Meringkas problem+json server menjadi satu kalimat Indonesia yang aman
// tampil. Kode error, nama field, dan dump availability tidak diteruskan.
export function ringkasGalatPengajuan(payload: unknown, status: number): string {
  if (status === 409) return PESAN_KONFLIK;
  if (typeof payload === "object" && payload !== null) {
    const body = payload as { errors?: unknown; detail?: unknown };
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      const label: string[] = [];
      for (const item of body.errors as GalatField[]) {
        const nama = labelUntukField(item?.field);
        if (nama && !label.includes(nama)) label.push(nama);
      }
      if (label.length > 0) return `Periksa kembali isian berikut: ${label.join(", ")}.`;
      return "Periksa kembali isian Anda dan coba lagi.";
    }
    if (typeof body.detail === "string" && body.detail.length > 0) {
      const detail: string = body.detail;
      const aman = !POLA_TEKNIS.test(detail) && !KUNCI_INTERNAL.some((kunci) => detail.includes(kunci));
      if (aman) return detail;
    }
  }
  return PESAN_GAGAL_UMUM;
}
