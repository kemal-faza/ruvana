import { OFFSET_ZONA_WAKTU_MENIT } from "@/config/business";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const OFFSET_MS = OFFSET_ZONA_WAKTU_MENIT * 60_000;

export interface CalendarDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

/** Mem-parse "YYYY-MM-DD" ketat, menolak tanggal kalender yang tidak ada (mis. 30 Februari). */
export function parseCalendarDate(raw: string): CalendarDate | null {
  const match = DATE_PATTERN.exec(raw);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const roundTrip = new Date(Date.UTC(year, month - 1, day));
  const valid =
    roundTrip.getUTCFullYear() === year &&
    roundTrip.getUTCMonth() === month - 1 &&
    roundTrip.getUTCDate() === day;

  return valid ? { year, month, day } : null;
}

/** Mengonversi tanggal kalender + jam WIB ("HH:MM") menjadi instant UTC. */
export function jakartaToUtc(date: CalendarDate, time: string): Date {
  const [hour, minute] = time.split(":").map(Number);
  const utcMillis = Date.UTC(date.year, date.month - 1, date.day, hour, minute) - OFFSET_MS;
  return new Date(utcMillis);
}

/** Rentang UTC setengah-terbuka [00:00, 24:00) WIB untuk satu tanggal kalender. */
export function jakartaDayRangeUtc(date: CalendarDate): { start: Date; end: Date } {
  const start = jakartaToUtc(date, "00:00");
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Memformat instant UTC menjadi jam dinding WIB "HH:MM". */
export function formatJakartaTime(instant: Date): string {
  const local = new Date(instant.getTime() + OFFSET_MS);
  const hour = String(local.getUTCHours()).padStart(2, "0");
  const minute = String(local.getUTCMinutes()).padStart(2, "0");
  return `${hour}:${minute}`;
}

/** Tanggal kalender WIB ("YYYY-MM-DD") untuk instant yang diberikan, default sekarang. */
export function todayJakarta(now: Date = new Date()): string {
  const local = new Date(now.getTime() + OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = String(local.getUTCMonth() + 1).padStart(2, "0");
  const day = String(local.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
