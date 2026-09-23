import type { ProblemFieldError } from "@/lib/http/problem";
import { TIPE_FASILITAS } from "@/config/business";
import { parseCalendarDate } from "@/lib/time/jakarta";

const MAX_PANJANG_TEKS = 200;

export interface PublicListQuery {
  page: number;
  perPage: number;
  search?: string;
  type?: (typeof TIPE_FASILITAS)[number];
  location?: string;
  minCapacity?: number;
}

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ProblemFieldError[] };

function parsePositiveInt(raw: string | null): number | null {
  if (raw === null) return null;
  if (!/^\d+$/.test(raw)) return NaN;
  return Number(raw);
}

/**
 * Membuang parameter yang nilainya kosong atau hanya spasi sebelum parse.
 * API tetap ketat (query mentah apa adanya), sedangkan halaman lebih permisif:
 * input form yang dikosongkan pengguna tidak boleh memicu 422.
 */
export function cleanSearchParams(searchParams: URLSearchParams): URLSearchParams {
  const cleaned = new URLSearchParams();
  for (const [key, value] of searchParams.entries()) {
    if (value.trim() !== "") {
      cleaned.append(key, value);
    }
  }
  return cleaned;
}

function parseBoundedText(raw: string | null, field: string): string | undefined | ProblemFieldError {
  if (raw === null) return undefined;
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { field, code: "TOO_SHORT", message: `${field} tidak boleh kosong` };
  }
  if (trimmed.length > MAX_PANJANG_TEKS) {
    return {
      field,
      code: "TOO_LONG",
      message: `${field} maksimal ${MAX_PANJANG_TEKS} karakter`,
    };
  }
  return trimmed;
}

function isProblemFieldError(value: unknown): value is ProblemFieldError {
  return typeof value === "object" && value !== null && "code" in value;
}

export function parsePublicListQuery(searchParams: URLSearchParams): ParseResult<PublicListQuery> {
  const errors: ProblemFieldError[] = [];

  const rawPage = searchParams.get("page");
  const page = parsePositiveInt(rawPage);
  if (Number.isNaN(page)) {
    errors.push({ field: "page", code: "INVALID_INTEGER", message: "page harus bilangan bulat positif" });
  } else if (page !== null && page < 1) {
    errors.push({ field: "page", code: "OUT_OF_RANGE", message: "page harus minimal 1" });
  }

  const rawPerPage = searchParams.get("perPage");
  const perPage = parsePositiveInt(rawPerPage);
  if (Number.isNaN(perPage)) {
    errors.push({ field: "perPage", code: "INVALID_INTEGER", message: "perPage harus bilangan bulat positif" });
  } else if (perPage !== null && (perPage < 1 || perPage > 100)) {
    errors.push({ field: "perPage", code: "OUT_OF_RANGE", message: "perPage harus di antara 1 dan 100" });
  }

  const search = parseBoundedText(searchParams.get("search"), "search");
  if (isProblemFieldError(search)) {
    errors.push(search);
  }

  const location = parseBoundedText(searchParams.get("location"), "location");
  if (isProblemFieldError(location)) {
    errors.push(location);
  }

  const rawType = searchParams.get("type");
  let type: PublicListQuery["type"];
  if (rawType !== null) {
    if ((TIPE_FASILITAS as readonly string[]).includes(rawType)) {
      type = rawType as PublicListQuery["type"];
    } else {
      errors.push({ field: "type", code: "INVALID_ENUM", message: "type harus salah satu tipe fasilitas yang dikenal" });
    }
  }

  const rawMinCapacity = searchParams.get("minCapacity");
  const minCapacity = parsePositiveInt(rawMinCapacity);
  if (Number.isNaN(minCapacity)) {
    errors.push({ field: "minCapacity", code: "INVALID_INTEGER", message: "minCapacity harus bilangan bulat positif" });
  } else if (minCapacity !== null && minCapacity < 1) {
    errors.push({ field: "minCapacity", code: "OUT_OF_RANGE", message: "minCapacity harus minimal 1" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      page: page ?? 1,
      perPage: perPage ?? 20,
      ...(search !== undefined ? { search: search as string } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(location !== undefined ? { location: location as string } : {}),
      ...(minCapacity !== null ? { minCapacity } : {}),
    },
  };
}

export function parseAvailabilityDate(raw: string | null): ParseResult<string> {
  if (raw === null) {
    return {
      ok: false,
      errors: [{ field: "date", code: "REQUIRED", message: "date wajib diisi (format YYYY-MM-DD)" }],
    };
  }

  if (!parseCalendarDate(raw)) {
    return {
      ok: false,
      errors: [{ field: "date", code: "INVALID_DATE", message: "date harus tanggal kalender valid berformat YYYY-MM-DD" }],
    };
  }

  return { ok: true, value: raw };
}

export function parseFacilityId(raw: string): ParseResult<number> {
  const id = parsePositiveInt(raw);
  if (id === null || Number.isNaN(id) || id < 1) {
    return {
      ok: false,
      errors: [{ field: "facilityId", code: "INVALID_INTEGER", message: "facilityId harus bilangan bulat positif" }],
    };
  }
  return { ok: true, value: id };
}
