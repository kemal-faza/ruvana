import { JAKARTA_TIMEZONE } from "@/config/business";

const offsetFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: JAKARTA_TIMEZONE,
  timeZoneName: "longOffset",
});

function parseCalendarDate(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4,})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new RangeError(`Tanggal kalender tidak valid: ${value}`);

  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function calendarDateToEpoch(value: string): number {
  const { year, month, day } = parseCalendarDate(value);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getTime();
}

function jakartaOffsetAt(instant: Date): number {
  const zoneName = offsetFormatter
    .formatToParts(instant)
    .find((part) => part.type === "timeZoneName")?.value;
  if (zoneName === "GMT") return 0;

  const match = /^GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(zoneName ?? "");
  if (!match) throw new RangeError(`Offset Asia/Jakarta tidak dapat dibaca: ${zoneName ?? "kosong"}`);

  const sign = match[1] === "+" ? 1 : -1;
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  const seconds = Number(match[4] ?? 0);
  return sign * ((hours * 60 + minutes) * 60 + seconds) * 1000;
}

function startOfJakartaDate(value: string): Date {
  const wallClockEpoch = calendarDateToEpoch(value);
  let candidate = wallClockEpoch;

  // Offset pada instant hasil memakai basis timezone IANA yang disediakan runtime.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const resolved = wallClockEpoch - jakartaOffsetAt(new Date(candidate));
    if (resolved === candidate) return new Date(resolved);
    candidate = resolved;
  }

  return new Date(candidate);
}

function nextCalendarDate(value: string): string {
  const next = new Date(calendarDateToEpoch(value) + 24 * 60 * 60 * 1000);
  const year = String(next.getUTCFullYear()).padStart(4, "0");
  const month = String(next.getUTCMonth() + 1).padStart(2, "0");
  const day = String(next.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface JakartaAnalyticsDateRange {
  startAt: Date;
  endAtExclusive: Date;
}

/** Mengubah rentang tanggal kampus inklusif menjadi instant UTC [awal, awal hari berikutnya). */
export function getJakartaAnalyticsDateRange(startDate: string, endDate: string): JakartaAnalyticsDateRange {
  return {
    startAt: startOfJakartaDate(startDate),
    endAtExclusive: startOfJakartaDate(nextCalendarDate(endDate)),
  };
}
