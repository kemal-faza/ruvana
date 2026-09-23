import type { ProblemFieldError } from "@/lib/http/problem";
import { BATAS_TUJUAN_MAX, BATAS_TUJUAN_MIN, VALID_END_TIMES, VALID_START_TIMES } from "@/config/business";
import { isSlotAligned, isValidDateFormat, isWithinOperationalHours, parseTimeToMinutes } from "@/lib/time/reservation-time";

export interface ReservationCreateInput {
  facilityId: number;
  date: string;
  startTime: string;
  endTime: string;
  tujuanPenggunaan: string;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; errors: ProblemFieldError[] };

export function parseReservationCreateBody(body: unknown): ParseResult<ReservationCreateInput> {
  const errors: ProblemFieldError[] = [];

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      ok: false,
      errors: [{ field: "body", code: "INVALID_BODY", message: "Body harus berupa objek JSON" }],
    };
  }

  const obj = body as Record<string, unknown>;

  // facilityId
  const rawFacilityId = obj.facilityId;
  let facilityId: number | null = null;
  if (typeof rawFacilityId !== "number" || !Number.isInteger(rawFacilityId) || rawFacilityId < 1) {
    errors.push({ field: "facilityId", code: "INVALID_FACILITY_ID", message: "facilityId harus bilangan bulat positif" });
  } else {
    facilityId = rawFacilityId;
  }

  // date
  const rawDate = obj.date;
  let date: string | null = null;
  if (typeof rawDate !== "string" || !isValidDateFormat(rawDate)) {
    errors.push({ field: "date", code: "INVALID_DATE", message: "date harus format YYYY-MM-DD yang valid" });
  } else {
    date = rawDate;
  }

  // startTime
  const rawStart = obj.startTime;
  let startTime: string | null = null;
  if (typeof rawStart !== "string") {
    errors.push({ field: "startTime", code: "INVALID_TIME", message: "startTime wajib diisi" });
  } else if (!(VALID_START_TIMES as readonly string[]).includes(rawStart)) {
    errors.push({
      field: "startTime",
      code: "SLOT_ALIGNMENT_INVALID",
      message: "startTime harus pada kelipatan 30 menit dalam 07:00–19:30",
    });
  } else {
    startTime = rawStart;
  }

  // endTime
  const rawEnd = obj.endTime;
  let endTime: string | null = null;
  if (typeof rawEnd !== "string") {
    errors.push({ field: "endTime", code: "INVALID_TIME", message: "endTime wajib diisi" });
  } else if (!(VALID_END_TIMES as readonly string[]).includes(rawEnd)) {
    errors.push({
      field: "endTime",
      code: "SLOT_ALIGNMENT_INVALID",
      message: "endTime harus pada kelipatan 30 menit dalam 07:30–20:00",
    });
  } else {
    endTime = rawEnd;
  }

  // tujuanPenggunaan
  const rawTujuan = obj.tujuanPenggunaan;
  let tujuanPenggunaan: string | null = null;
  if (typeof rawTujuan !== "string") {
    errors.push({ field: "tujuanPenggunaan", code: "INVALID_TUJUAN", message: "tujuanPenggunaan wajib diisi" });
  } else {
    const trimmed = rawTujuan.trim();
    if (trimmed.length < BATAS_TUJUAN_MIN) {
      errors.push({ field: "tujuanPenggunaan", code: "TOO_SHORT", message: "tujuanPenggunaan tidak boleh kosong" });
    } else if (trimmed.length > BATAS_TUJUAN_MAX) {
      errors.push({
        field: "tujuanPenggunaan",
        code: "TOO_LONG",
        message: `tujuanPenggunaan maksimal ${BATAS_TUJUAN_MAX} karakter`,
      });
    } else {
      tujuanPenggunaan = trimmed;
    }
  }

  // Validasi silang waktu
  if (startTime && endTime) {
    // Pastikan isSlotAligned juga (sudah via enum, tapi double check)
    if (!isSlotAligned(startTime) || !isSlotAligned(endTime)) {
      errors.push({ field: "startTime", code: "SLOT_ALIGNMENT_INVALID", message: "Waktu harus berada pada kelipatan 30 menit." });
    } else if (!isWithinOperationalHours(startTime, endTime)) {
      errors.push({ field: "endTime", code: "OUTSIDE_OPERATIONAL_HOURS", message: "Rentang waktu harus dalam 07:00–20:00 dan startTime < endTime" });
    } else {
      const s = parseTimeToMinutes(startTime);
      const e = parseTimeToMinutes(endTime);
      if (e <= s) {
        errors.push({ field: "endTime", code: "END_BEFORE_START", message: "endTime harus setelah startTime" });
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      facilityId: facilityId as number,
      date: date as string,
      startTime: startTime as string,
      endTime: endTime as string,
      tujuanPenggunaan: tujuanPenggunaan as string,
    },
  };
}

export interface CancelReservationInput {
  alasan: string;
}

// Body POST /api/reservations/[id]/cancel — ReasonRequest di openapi.
export function parseCancelBody(body: unknown): ParseResult<CancelReservationInput> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      ok: false,
      errors: [{ field: "body", code: "INVALID_BODY", message: "Body harus berupa objek JSON" }],
    };
  }

  const obj = body as Record<string, unknown>;
  const rawAlasan = obj.alasan;
  if (typeof rawAlasan !== "string") {
    return {
      ok: false,
      errors: [{ field: "alasan", code: "INVALID_ALASAN", message: "alasan wajib diisi" }],
    };
  }
  const trimmed = rawAlasan.trim();
  if (trimmed.length < 1) {
    return {
      ok: false,
      errors: [{ field: "alasan", code: "TOO_SHORT", message: "alasan tidak boleh kosong" }],
    };
  }
  if (trimmed.length > 500) {
    return {
      ok: false,
      errors: [{ field: "alasan", code: "TOO_LONG", message: "alasan maksimal 500 karakter" }],
    };
  }
  return { ok: true, value: { alasan: trimmed } };
}
