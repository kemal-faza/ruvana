import { STATUS_FASILITAS, TIPE_FASILITAS, FASILITAS_UPLOAD } from "@/config/business";
import type { StatusFasilitas, TipeFasilitas } from "@/generated/prisma/enums";
import type { ProblemFieldError } from "@/lib/http/problem";
import { parsePositiveInt, BATAS_INT4 } from "@/lib/validation/facility-query";

const BATAS_NAMA = 100;
const BATAS_LOKASI = 200;
const BATAS_DESKRIPSI = 2000;
const BATAS_SEARCH = 200;
const BATAS_PATHNAME = 300;

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ProblemFieldError[] };

export interface AdminListQuery {
  page: number;
  perPage: number;
  search?: string;
  type?: TipeFasilitas;
  location?: string;
  status?: StatusFasilitas;
}

export interface FacilityCreateInput {
  nama: string;
  tipe: TipeFasilitas;
  lokasi: string;
  kapasitas: number;
  deskripsi?: string | null;
  fotoPathname?: string | null;
  fotoType?: string;
  fotoSize?: number;
}

export interface FacilityUpdateInput {
  nama?: string;
  tipe?: TipeFasilitas;
  lokasi?: string;
  kapasitas?: number;
  deskripsi?: string | null;
  status?: StatusFasilitas;
  // `null` menghapus foto; string mengganti; undefined membiarkan tidak berubah.
  fotoPathname?: string | null;
  fotoType?: string;
  fotoSize?: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseAdminListQuery(searchParams: URLSearchParams): ParseResult<AdminListQuery> {
  const errors: ProblemFieldError[] = [];

  const page = parsePositiveInt(searchParams.get("page"));
  if (Number.isNaN(page)) {
    errors.push({ field: "page", code: "INVALID_INTEGER", message: "page harus bilangan bulat positif" });
  } else if (page !== null && page < 1) {
    errors.push({ field: "page", code: "OUT_OF_RANGE", message: "page harus minimal 1" });
  }

  const perPage = parsePositiveInt(searchParams.get("perPage"));
  if (Number.isNaN(perPage)) {
    errors.push({ field: "perPage", code: "INVALID_INTEGER", message: "perPage harus bilangan bulat positif" });
  } else if (perPage !== null && (perPage < 1 || perPage > 100)) {
    errors.push({ field: "perPage", code: "OUT_OF_RANGE", message: "perPage harus di antara 1 dan 100" });
  }

  const rawSearch = searchParams.get("search");
  let search: string | undefined;
  if (rawSearch !== null) {
    const trimmed = rawSearch.trim();
    if (trimmed.length === 0) {
      errors.push({ field: "search", code: "TOO_SHORT", message: "search tidak boleh kosong" });
    } else if (trimmed.length > BATAS_SEARCH) {
      errors.push({ field: "search", code: "TOO_LONG", message: `search maksimal ${BATAS_SEARCH} karakter` });
    } else {
      search = trimmed;
    }
  }

  const rawLocation = searchParams.get("location");
  let location: string | undefined;
  if (rawLocation !== null) {
    const trimmed = rawLocation.trim();
    if (trimmed.length === 0) {
      errors.push({ field: "location", code: "TOO_SHORT", message: "location tidak boleh kosong" });
    } else if (trimmed.length > BATAS_LOKASI) {
      errors.push({ field: "location", code: "TOO_LONG", message: `location maksimal ${BATAS_LOKASI} karakter` });
    } else {
      location = trimmed;
    }
  }

  const rawType = searchParams.get("type");
  let type: TipeFasilitas | undefined;
  if (rawType !== null) {
    if ((TIPE_FASILITAS as readonly string[]).includes(rawType)) {
      type = rawType as TipeFasilitas;
    } else {
      errors.push({ field: "type", code: "INVALID_ENUM", message: "type harus salah satu tipe fasilitas yang dikenal" });
    }
  }

  const rawStatus = searchParams.get("status");
  let status: StatusFasilitas | undefined;
  if (rawStatus !== null) {
    if ((STATUS_FASILITAS as readonly string[]).includes(rawStatus)) {
      status = rawStatus as StatusFasilitas;
    } else {
      errors.push({ field: "status", code: "INVALID_ENUM", message: "status harus salah satu status fasilitas yang dikenal" });
    }
  }

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      page: page ?? 1,
      perPage: perPage ?? 20,
      ...(search !== undefined ? { search } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(status !== undefined ? { status } : {}),
    },
  };
}

function parseBoundedString(
  value: unknown,
  field: string,
  max: number,
  { required }: { required: boolean },
  errors: ProblemFieldError[],
): string | undefined {
  if (value === undefined) {
    if (required) errors.push({ field, code: "REQUIRED", message: `${field} wajib diisi` });
    return undefined;
  }
  if (typeof value !== "string") {
    errors.push({ field, code: "INVALID_TYPE", message: `${field} harus berupa teks` });
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    errors.push({ field, code: "TOO_SHORT", message: `${field} tidak boleh kosong` });
    return undefined;
  }
  if (trimmed.length > max) {
    errors.push({ field, code: "TOO_LONG", message: `${field} maksimal ${max} karakter` });
    return undefined;
  }
  return trimmed;
}

function parseDeskripsi(value: unknown, errors: ProblemFieldError[]): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") {
    errors.push({ field: "deskripsi", code: "INVALID_TYPE", message: "deskripsi harus berupa teks atau null" });
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > BATAS_DESKRIPSI) {
    errors.push({ field: "deskripsi", code: "TOO_LONG", message: `deskripsi maksimal ${BATAS_DESKRIPSI} karakter` });
    return undefined;
  }
  return trimmed.length === 0 ? null : trimmed;
}

function parseKapasitas(value: unknown, required: boolean, errors: ProblemFieldError[]): number | undefined {
  if (value === undefined) {
    if (required) errors.push({ field: "kapasitas", code: "REQUIRED", message: "kapasitas wajib diisi" });
    return undefined;
  }
  if (typeof value !== "number" || !Number.isSafeInteger(value)) {
    errors.push({ field: "kapasitas", code: "INVALID_INTEGER", message: "kapasitas harus bilangan bulat" });
    return undefined;
  }
  if (value < 1) {
    errors.push({ field: "kapasitas", code: "OUT_OF_RANGE", message: "kapasitas harus minimal 1" });
    return undefined;
  }
  if (value > BATAS_INT4) {
    errors.push({ field: "kapasitas", code: "OUT_OF_RANGE", message: `kapasitas maksimal ${BATAS_INT4}` });
    return undefined;
  }
  return value;
}

function parseTipe(value: unknown, required: boolean, errors: ProblemFieldError[]): TipeFasilitas | undefined {
  if (value === undefined) {
    if (required) errors.push({ field: "tipe", code: "REQUIRED", message: "tipe wajib diisi" });
    return undefined;
  }
  if (typeof value !== "string" || !(TIPE_FASILITAS as readonly string[]).includes(value)) {
    errors.push({ field: "tipe", code: "INVALID_ENUM", message: "tipe harus salah satu tipe fasilitas yang dikenal" });
    return undefined;
  }
  return value as TipeFasilitas;
}

function parseStatus(value: unknown, errors: ProblemFieldError[]): StatusFasilitas | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !(STATUS_FASILITAS as readonly string[]).includes(value)) {
    errors.push({ field: "status", code: "INVALID_ENUM", message: "status harus salah satu status fasilitas yang dikenal" });
    return undefined;
  }
  return value as StatusFasilitas;
}

interface FotoFields {
  fotoPathname?: string | null;
  fotoType?: string;
  fotoSize?: number;
}

/**
 * `fotoPathname` string menandakan foto baru (butuh `fotoType`/`fotoSize` yang
 * cocok), `null` menghapus foto, `undefined` membiarkan tidak berubah. Kepemilikan
 * pathname dan keaslian konten diverifikasi di service, bukan di sini.
 */
function parseFotoMetadata(body: Record<string, unknown>, errors: ProblemFieldError[]): FotoFields {
  const rawPathname = body.fotoPathname;
  const result: FotoFields = {};

  if (rawPathname === undefined) return result;
  if (rawPathname === null) {
    result.fotoPathname = null;
    return result;
  }
  if (typeof rawPathname !== "string" || rawPathname.trim().length === 0 || rawPathname.length > BATAS_PATHNAME) {
    errors.push({ field: "fotoPathname", code: "INVALID_TYPE", message: "fotoPathname tidak valid" });
    return result;
  }

  result.fotoPathname = rawPathname;

  const rawType = typeof body.fotoType === "string" ? body.fotoType.toLowerCase() : "";
  if ((FASILITAS_UPLOAD.tipeDiizinkan as readonly string[]).includes(rawType)) {
    result.fotoType = rawType;
  } else {
    errors.push({ field: "fotoType", code: "INVALID_CONTENT_TYPE", message: "Foto harus berupa JPEG, PNG, atau WebP." });
  }

  const rawSize = body.fotoSize;
  if (typeof rawSize === "number" && Number.isSafeInteger(rawSize) && rawSize >= 1 && rawSize <= FASILITAS_UPLOAD.maksByte) {
    result.fotoSize = rawSize;
  } else {
    errors.push({
      field: "fotoSize",
      code: "OUT_OF_RANGE",
      message: `Ukuran foto maksimal ${FASILITAS_UPLOAD.maksByte} byte.`,
    });
  }

  return result;
}

function rejectUnknownFields(body: Record<string, unknown>, allowed: readonly string[], errors: ProblemFieldError[]) {
  for (const key of Object.keys(body)) {
    if (!allowed.includes(key)) {
      errors.push({ field: key, code: "UNKNOWN_FIELD", message: "Field tidak dikenal" });
    }
  }
}

const CREATE_FIELDS = ["nama", "tipe", "lokasi", "kapasitas", "deskripsi", "fotoPathname", "fotoType", "fotoSize"] as const;
const UPDATE_FIELDS = ["nama", "tipe", "lokasi", "kapasitas", "deskripsi", "status", "fotoPathname", "fotoType", "fotoSize"] as const;

export function parseFacilityCreateBody(body: unknown): ParseResult<FacilityCreateInput> {
  if (!isObject(body)) {
    return { ok: false, errors: [{ field: "body", code: "INVALID_BODY", message: "Body harus berupa objek JSON" }] };
  }

  const errors: ProblemFieldError[] = [];
  rejectUnknownFields(body, CREATE_FIELDS, errors);

  const nama = parseBoundedString(body.nama, "nama", BATAS_NAMA, { required: true }, errors);
  const tipe = parseTipe(body.tipe, true, errors);
  const lokasi = parseBoundedString(body.lokasi, "lokasi", BATAS_LOKASI, { required: true }, errors);
  const kapasitas = parseKapasitas(body.kapasitas, true, errors);
  const deskripsi = parseDeskripsi(body.deskripsi, errors);
  const foto = parseFotoMetadata(body, errors);

  if (errors.length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      nama: nama as string,
      tipe: tipe as TipeFasilitas,
      lokasi: lokasi as string,
      kapasitas: kapasitas as number,
      ...(deskripsi !== undefined ? { deskripsi } : {}),
      ...foto,
    },
  };
}

export function parseFacilityUpdateBody(body: unknown): ParseResult<FacilityUpdateInput> {
  if (!isObject(body)) {
    return { ok: false, errors: [{ field: "body", code: "INVALID_BODY", message: "Body harus berupa objek JSON" }] };
  }

  const errors: ProblemFieldError[] = [];
  rejectUnknownFields(body, UPDATE_FIELDS, errors);

  const nama = parseBoundedString(body.nama, "nama", BATAS_NAMA, { required: false }, errors);
  const tipe = parseTipe(body.tipe, false, errors);
  const lokasi = parseBoundedString(body.lokasi, "lokasi", BATAS_LOKASI, { required: false }, errors);
  const kapasitas = parseKapasitas(body.kapasitas, false, errors);
  const deskripsi = parseDeskripsi(body.deskripsi, errors);
  const status = parseStatus(body.status, errors);
  const foto = parseFotoMetadata(body, errors);

  if (errors.length > 0) return { ok: false, errors };

  const value: FacilityUpdateInput = {
    ...(nama !== undefined ? { nama } : {}),
    ...(tipe !== undefined ? { tipe } : {}),
    ...(lokasi !== undefined ? { lokasi } : {}),
    ...(kapasitas !== undefined ? { kapasitas } : {}),
    ...(deskripsi !== undefined ? { deskripsi } : {}),
    ...(status !== undefined ? { status } : {}),
    ...foto,
  };

  if (Object.keys(value).length === 0) {
    return { ok: false, errors: [{ field: "body", code: "MIN_PROPERTIES", message: "Minimal satu field harus dikirim" }] };
  }

  return { ok: true, value };
}
