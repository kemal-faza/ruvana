import type { ProblemFieldError } from "@/lib/http/problem";
import {
  MAKS_CATATAN_RESOLUSI_LAPORAN,
  STATUS_LAPORAN_ANTREAN_MASUK,
  STATUS_LAPORAN_KERJA_PETUGAS,
  STATUS_LAPORAN_RIWAYAT_PETUGAS,
} from "@/config/business";

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: ProblemFieldError[] };

/**
 * Antrean laporan petugas: `intake` hanya NEW, `work` NEW + IN_PROGRESS, dan
 * `riwayat` laporan yang sudah RESOLVED atau REJECTED.
 */
export const ANTREAN_LAPORAN = ["intake", "work", "riwayat"] as const;
export type AntreanLaporan = (typeof ANTREAN_LAPORAN)[number];

/** Urutan antrean: terlama lebih dulu (bawaan) atau terbaru lebih dulu. */
export const URUTAN_LAPORAN = ["terlama", "terbaru"] as const;
export type UrutanLaporan = (typeof URUTAN_LAPORAN)[number];

export const URUTAN_LAPORAN_BAWAAN: UrutanLaporan = "terlama";

export const STATUS_ANTREAN_LAPORAN: Record<AntreanLaporan, readonly string[]> = {
  intake: STATUS_LAPORAN_ANTREAN_MASUK,
  work: STATUS_LAPORAN_KERJA_PETUGAS,
  riwayat: STATUS_LAPORAN_RIWAYAT_PETUGAS,
};

export interface StaffReportQueueQuery {
  queue: AntreanLaporan;
  urut: UrutanLaporan;
  page: number;
  perPage: number;
}

export const PER_HALAMAN_ANTREAN_LAPORAN = 20;

function parsePositiveInt(raw: string | null): number | null {
  if (raw === null) return null;
  if (!/^\d+$/.test(raw)) return NaN;
  const value = Number(raw);
  return Number.isSafeInteger(value) ? value : NaN;
}

export function parseReportId(raw: string): ParseResult<number> {
  const id = parsePositiveInt(raw);
  if (id === null || Number.isNaN(id) || id < 1) {
    return {
      ok: false,
      errors: [{ field: "reportId", code: "INVALID_INTEGER", message: "reportId harus bilangan bulat positif" }],
    };
  }
  return { ok: true, value: id };
}

export function parseStaffReportQueueQuery(searchParams: URLSearchParams): ParseResult<StaffReportQueueQuery> {
  const errors: ProblemFieldError[] = [];

  const rawQueue = searchParams.get("queue");
  if (rawQueue === null) {
    errors.push({
      field: "queue",
      code: "REQUIRED",
      message: "queue wajib diisi (intake untuk laporan baru, work untuk daftar pekerjaan, riwayat untuk arsip)",
    });
  } else if (!(ANTREAN_LAPORAN as readonly string[]).includes(rawQueue)) {
    errors.push({ field: "queue", code: "INVALID_ENUM", message: "queue harus intake, work, atau riwayat" });
  }

  const rawUrutan = searchParams.get("sort");
  if (rawUrutan !== null && !(URUTAN_LAPORAN as readonly string[]).includes(rawUrutan)) {
    errors.push({ field: "sort", code: "INVALID_ENUM", message: "sort harus terlama atau terbaru" });
  }

  const rawPage = parsePositiveInt(searchParams.get("page"));
  if (Number.isNaN(rawPage)) {
    errors.push({ field: "page", code: "INVALID_INTEGER", message: "page harus bilangan bulat positif" });
  } else if (rawPage !== null && rawPage < 1) {
    errors.push({ field: "page", code: "OUT_OF_RANGE", message: "page harus minimal 1" });
  }

  const rawPerPage = parsePositiveInt(searchParams.get("perPage"));
  if (Number.isNaN(rawPerPage)) {
    errors.push({ field: "perPage", code: "INVALID_INTEGER", message: "perPage harus bilangan bulat positif" });
  } else if (rawPerPage !== null && (rawPerPage < 1 || rawPerPage > 100)) {
    errors.push({ field: "perPage", code: "OUT_OF_RANGE", message: "perPage harus di antara 1 dan 100" });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      queue: rawQueue as AntreanLaporan,
      urut: (rawUrutan as UrutanLaporan | null) ?? URUTAN_LAPORAN_BAWAAN,
      page: rawPage ?? 1,
      perPage: rawPerPage ?? PER_HALAMAN_ANTREAN_LAPORAN,
    },
  };
}

/** Nilai antrean dan urutan dari URL; nilai lain jatuh ke bawaan yang aman. */
export function parseAntreanDanUrutan(searchParams: {
  queue?: string | string[] | undefined;
  sort?: string | string[] | undefined;
}): { queue: AntreanLaporan; urut: UrutanLaporan } {
  const queue = Array.isArray(searchParams.queue) ? searchParams.queue[0] : searchParams.queue;
  const urut = Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort;

  return {
    queue: (ANTREAN_LAPORAN as readonly string[]).includes(queue ?? "")
      ? (queue as AntreanLaporan)
      : "intake",
    urut: (URUTAN_LAPORAN as readonly string[]).includes(urut ?? "")
      ? (urut as UrutanLaporan)
      : URUTAN_LAPORAN_BAWAAN,
  };
}

export interface ReportResolutionInput {
  catatanResolusi: string;
}

/**
 * Body POST /api/staff/reports/{reportId}/resolve dan /reject (OpenAPI
 * ResolutionRequest). Catatan penyelesaian wajib pada status terminal REP-03.
 */
export function parseReportResolutionBody(body: unknown): ParseResult<ReportResolutionInput> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      ok: false,
      errors: [{ field: "body", code: "INVALID_BODY", message: "Body harus berupa objek JSON" }],
    };
  }

  const fields = Object.keys(body as Record<string, unknown>);
  const unexpected = fields.filter((field) => field !== "catatanResolusi");
  if (unexpected.length > 0) {
    return {
      ok: false,
      errors: unexpected.map((field) => ({
        field,
        code: "UNEXPECTED_FIELD",
        message: `Field ${field} tidak dikenali`,
      })),
    };
  }

  const rawCatatan = (body as Record<string, unknown>).catatanResolusi;
  if (typeof rawCatatan !== "string") {
    return {
      ok: false,
      errors: [
        { field: "catatanResolusi", code: "REQUIRED", message: "catatanResolusi wajib diisi" },
      ],
    };
  }

  const catatanResolusi = rawCatatan.trim();
  if (catatanResolusi.length < 1) {
    return {
      ok: false,
      errors: [
        { field: "catatanResolusi", code: "TOO_SHORT", message: "catatanResolusi tidak boleh kosong" },
      ],
    };
  }
  if (catatanResolusi.length > MAKS_CATATAN_RESOLUSI_LAPORAN) {
    return {
      ok: false,
      errors: [
        {
          field: "catatanResolusi",
          code: "TOO_LONG",
          message: `catatanResolusi maksimal ${MAKS_CATATAN_RESOLUSI_LAPORAN} karakter`,
        },
      ],
    };
  }

  return { ok: true, value: { catatanResolusi } };
}