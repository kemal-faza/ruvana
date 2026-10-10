import { BATAS_PENGAJUAN_JAM, DURASI_SLOT_MENIT, JAM_OPERASIONAL, OFFSET_ZONA_WAKTU_MENIT } from "@/config/business";

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

export function isSlotAligned(time: string): boolean {
  if (!isValidTimeFormat(time)) return false;
  const minutes = parseTimeToMinutes(time) % DURASI_SLOT_MENIT;
  return minutes === 0;
}

export function isWithinOperationalHours(startTime: string, endTime: string): boolean {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  const open = parseTimeToMinutes(JAM_OPERASIONAL.mulai);
  const close = parseTimeToMinutes(JAM_OPERASIONAL.selesai);
  return start >= open && end <= close && start < end;
}

/**
 * Konversi tanggal kalender Asia/Jakarta + waktu lokal ke instant UTC.
 * dateStr: YYYY-MM-DD, timeStr: HH:mm dalam zona Asia/Jakarta.
 */
export function asiaJakartaToUtc(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);
  // Buat UTC dengan mengurangi offset Jakarta
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute) - OFFSET_ZONA_WAKTU_MENIT * 60 * 1000;
  return new Date(utcMillis);
}

/** Representasikan tanggal kalender sebagai UTC midnight untuk kolom PostgreSQL DATE. */
export function calendarDateToUtcMidnight(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function formatDateAsiaJakarta(date: Date): string {
  // Manual formatting agar tidak bergantung locale runtime
  // Konversi UTC ke Jakarta dengan menambah offset
  const jakartaMillis = date.getTime() + OFFSET_ZONA_WAKTU_MENIT * 60 * 1000;
  const d = new Date(jakartaMillis);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function formatTimeAsiaJakarta(date: Date): string {
  const jakartaMillis = date.getTime() + OFFSET_ZONA_WAKTU_MENIT * 60 * 1000;
  const d = new Date(jakartaMillis);
  const h = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${h}:${mm}`;
}

export function getTodayDateAsiaJakarta(now: Date = new Date()): string {
  return formatDateAsiaJakarta(now);
}

export function isPastDate(dateStr: string, now: Date = new Date()): boolean {
  const today = getTodayDateAsiaJakarta(now);
  return dateStr < today;
}

/**
 * Benar bila sisa waktu menuju mulai kurang dari batas pengajuan H-14
 * (BATAS_PENGAJUAN_JAM = 336 jam), dihitung sebagai selisih tepat dua instant —
 * sama seperti cara batas pembatalan H-24. Tepat 14 hari berarti tidak melanggar.
 * Dipakai bersama server (penolakan otoritatif) dan UI (penonaktifan slot).
 */
export function isKurangDariBatasPengajuan(startsAt: Date, now: Date = new Date()): boolean {
  return startsAt.getTime() - now.getTime() < BATAS_PENGAJUAN_JAM * 60 * 60 * 1000;
}

export function isValidDateFormat(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  // Pastikan hasil parsing ISO date sesuai (hindari 2026-02-31 lolos)
  const iso = d.toISOString().slice(0, 10);
  return iso === dateStr;
}
