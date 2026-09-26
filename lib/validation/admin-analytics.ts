import type { ProblemFieldError } from "@/lib/http/problem";
import { getTodayDateAsiaJakarta, isValidDateFormat } from "@/lib/time/reservation-time";

export interface AnalyticsFilters {
  startDate: string;
  endDate: string;
  location: string | null;
}

export interface AnalyticsFilterValues {
  startDate: string;
  endDate: string;
  location: string;
}

export type AnalyticsFilterSearchParams = Record<string, string | string[] | undefined>;

export type AnalyticsFilterParseResult =
  | { ok: true; value: AnalyticsFilters }
  | { ok: false; errors: ProblemFieldError[]; values: AnalyticsFilterValues };

const LABEL_FIELD_FILTER: Record<string, string> = {
  startDate: "tanggal awal",
  endDate: "tanggal akhir",
  location: "lokasi",
};

function getSingleValue(
  raw: string | string[] | undefined,
  field: string,
  errors: ProblemFieldError[],
): string | undefined {
  if (Array.isArray(raw)) {
    if (raw.length !== 1) {
      errors.push({
        field,
        code: "DUPLICATE_FILTER",
        message: `Filter ${LABEL_FIELD_FILTER[field] ?? field} hanya boleh diisi satu kali.`,
      });
    }
    return raw[0];
  }
  return raw;
}

function isValidAnalyticsDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) > 0 && isValidDateFormat(value);
}

function defaultPeriod(now: Date): Pick<AnalyticsFilterValues, "startDate" | "endDate"> {
  const today = getTodayDateAsiaJakarta(now);
  return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
}

export function parseAnalyticsFilters(
  searchParams: AnalyticsFilterSearchParams,
  now: Date = new Date(),
): AnalyticsFilterParseResult {
  const errors: ProblemFieldError[] = [];
  const rawStartDate = getSingleValue(searchParams.startDate, "startDate", errors);
  const rawEndDate = getSingleValue(searchParams.endDate, "endDate", errors);
  const rawLocation = getSingleValue(searchParams.location, "location", errors);
  const dateFiltersPresent = rawStartDate !== undefined || rawEndDate !== undefined;
  const defaults = defaultPeriod(now);
  const startDate = dateFiltersPresent ? (rawStartDate ?? "") : defaults.startDate;
  const endDate = dateFiltersPresent ? (rawEndDate ?? "") : defaults.endDate;
  const location = rawLocation?.trim() ?? "";
  const values = { startDate, endDate, location };

  if (dateFiltersPresent && (rawStartDate === undefined || rawEndDate === undefined)) {
    errors.push({
      field: rawStartDate === undefined ? "startDate" : "endDate",
      code: "DATE_RANGE_REQUIRED",
      message: "Tanggal awal dan akhir harus diisi bersama.",
    });
  }

  if (!isValidAnalyticsDate(startDate)) {
    errors.push({ field: "startDate", code: "INVALID_DATE", message: "Tanggal awal tidak valid." });
  }
  if (!isValidAnalyticsDate(endDate)) {
    errors.push({ field: "endDate", code: "INVALID_DATE", message: "Tanggal akhir tidak valid." });
  }
  if (isValidAnalyticsDate(startDate) && isValidAnalyticsDate(endDate) && startDate > endDate) {
    errors.push({
      field: "startDate",
      code: "DATE_RANGE_INVALID",
      message: "Tanggal awal harus sama dengan atau sebelum tanggal akhir.",
    });
  }

  if (errors.length > 0) return { ok: false, errors, values };
  return {
    ok: true,
    value: { startDate, endDate, location: location || null },
  };
}
