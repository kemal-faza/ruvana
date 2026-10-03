// Validasi param bulan rekap petugas (RES-11).
// Controller: dipakai Server Component dashboard petugas sebelum memanggil
// service. Nilai tidak valid jatuh ke default (bulan berjalan Asia/Jakarta)
// dengan pesan jelas, bukan error.
import { getTodayDateAsiaJakarta } from "@/lib/time/reservation-time";

export type StaffRecapMonthSearchParams = Record<string, string | string[] | undefined>;

export interface StaffRecapMonthParseResult {
  month: string;
  warning: string | null;
}

const POLA_BULAN = /^(\d{4})-(0[1-9]|1[0-2])$/;

function ambilNilaiTunggal(raw: string | string[] | undefined): string | undefined {
  if (Array.isArray(raw)) return raw.length === 1 ? raw[0] : undefined;
  return raw;
}

// Bulan berjalan menurut kalender Asia/Jakarta.
export function getStaffRecapDefaultMonth(now: Date = new Date()): string {
  return getTodayDateAsiaJakarta(now).slice(0, 7);
}

function bulanValid(value: string): boolean {
  const cocok = POLA_BULAN.exec(value);
  if (!cocok) return false;
  const tahun = Number(cocok[1]);
  if (tahun <= 0) return false;
  // Pastikan hasil konstruksi tanggal sesuai (menolak 2026-00 dsb.).
  const awal = new Date(Date.UTC(tahun, Number(value.slice(5, 7)) - 1, 1));
  return awal.toISOString().slice(0, 7) === value;
}

// Label Indonesia untuk bulan kalender, mis. "September 2026".
export function formatMonthLabelIndonesia(month: string): string {
  const [tahun, bulan] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(tahun, bulan - 1, 1)));
}

export function parseStaffRecapMonth(
  searchParams: StaffRecapMonthSearchParams,
  now: Date = new Date(),
): StaffRecapMonthParseResult {
  const bawaan = getStaffRecapDefaultMonth(now);
  const bulan = ambilNilaiTunggal(searchParams.bulan);
  const tahun = ambilNilaiTunggal(searchParams.tahun);
  const mentah = tahun === undefined
    ? bulan
    : bulan && /^\d{1,2}$/.test(bulan) && /^\d{1,4}$/.test(tahun)
      ? `${tahun.padStart(4, "0")}-${bulan.padStart(2, "0")}`
      : undefined;

  if (mentah === undefined) {
    if (searchParams.bulan !== undefined || searchParams.tahun !== undefined) {
      return {
        month: bawaan,
        warning: `Parameter bulan tidak valid, menampilkan rekap bulan ${formatMonthLabelIndonesia(bawaan)}.`,
      };
    }
    return { month: bawaan, warning: null };
  }

  if (!bulanValid(mentah)) {
    return {
      month: bawaan,
      warning: `Parameter bulan tidak valid, menampilkan rekap bulan ${formatMonthLabelIndonesia(bawaan)}.`,
    };
  }

  return { month: mentah, warning: null };
}

export interface MonthCalendarRange {
  startDate: string;
  endDate: string;
}

// Rentang tanggal kalender inklusif untuk satu bulan.
export function getMonthRange(month: string): MonthCalendarRange {
  const [tahun, bulan] = month.split("-").map(Number);
  const hariTerakhir = new Date(Date.UTC(tahun, bulan, 0)).getUTCDate();
  const awalan = `${month}-01`;
  const akhir = `${month}-${String(hariTerakhir).padStart(2, "0")}`;
  return { startDate: awalan, endDate: akhir };
}

// Daftar 6 bulan terakhir (termasuk bulan terpilih), terurut dari terlama.
export function listTrendMonths(month: string, jumlah = 6): string[] {
  const [tahun, bulan] = month.split("-").map(Number);
  const daftar: string[] = [];
  for (let mundur = jumlah - 1; mundur >= 0; mundur -= 1) {
    const tanggal = new Date(Date.UTC(tahun, bulan - 1 - mundur, 1));
    daftar.push(tanggal.toISOString().slice(0, 7));
  }
  return daftar;
}
