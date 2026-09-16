import { JAM_OPERASIONAL } from "@/config/business";

// Konstanta offset Asia/Jakarta UTC+7 tanpa DST
const JAKARTA_OFFSET_MINUTES = 7 * 60;

export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function isValidTimeFormat(time: string): boolean {
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(time);
}

export function isSlotAligned(time: string): boolean {
  if (!isValidTimeFormat(time)) return false;
  const minutes = parseTimeToMinutes(time) % 30;
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
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute) - JAKARTA_OFFSET_MINUTES * 60 * 1000;
  return new Date(utcMillis);
}

export function formatDateAsiaJakarta(date: Date): string {
  // Manual formatting agar tidak bergantung locale runtime
  // Konversi UTC ke Jakarta dengan menambah offset
  const jakartaMillis = date.getTime() + JAKARTA_OFFSET_MINUTES * 60 * 1000;
  const d = new Date(jakartaMillis);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function formatTimeAsiaJakarta(date: Date): string {
  const jakartaMillis = date.getTime() + JAKARTA_OFFSET_MINUTES * 60 * 1000;
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

export function isValidDateFormat(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  // Pastikan hasil parsing ISO date sesuai (hindari 2026-02-31 lolos)
  const iso = d.toISOString().slice(0, 10);
  return iso === dateStr;
}

/**
 * Generate 26 slot 07:00-20:00 untuk availability response.
 */
export function generateAllSlots(): Array<{ startTime: string; endTime: string }> {
  const slots: Array<{ startTime: string; endTime: string }> = [];
  let startMin = parseTimeToMinutes(JAM_OPERASIONAL.mulai);
  const endMin = parseTimeToMinutes(JAM_OPERASIONAL.selesai);
  while (startMin < endMin) {
    const end = startMin + 30;
    const sH = String(Math.floor(startMin / 60)).padStart(2, "0");
    const sM = String(startMin % 60).padStart(2, "0");
    const eH = String(Math.floor(end / 60)).padStart(2, "0");
    const eM = String(end % 60).padStart(2, "0");
    slots.push({ startTime: `${sH}:${sM}`, endTime: `${eH}:${eM}` });
    startMin = end;
  }
  return slots;
}
