import { STATUS_RESERVASI } from "@/config/business";
import type { ProblemFieldError } from "@/lib/http/problem";

export interface MyReservationListQuery {
  page: number;
  perPage: number;
  status?: (typeof STATUS_RESERVASI)[number];
}

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ProblemFieldError[] };

function parsePositiveInt(raw: string | null): number | null {
  if (raw === null) return null;
  if (!/^\d+$/.test(raw)) return NaN;
  return Number(raw);
}

export function parseMyReservationListQuery(searchParams: URLSearchParams): ParseResult<MyReservationListQuery> {
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

  const rawStatus = searchParams.get("status");
  let status: MyReservationListQuery["status"];
  if (rawStatus !== null) {
    if (!(STATUS_RESERVASI as readonly string[]).includes(rawStatus)) {
      errors.push({
        field: "status",
        code: "INVALID_STATUS",
        message: `status harus salah satu dari: ${STATUS_RESERVASI.join(", ")}`,
      });
    } else {
      status = rawStatus as MyReservationListQuery["status"];
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      page: page ?? 1,
      perPage: perPage ?? 20,
      ...(status ? { status } : {}),
    },
  };
}

export function parseReservationId(raw: string): ParseResult<number> {
  const id = parsePositiveInt(raw);
  if (id === null || Number.isNaN(id) || id < 1) {
    return {
      ok: false,
      errors: [{ field: "reservationId", code: "INVALID_INTEGER", message: "reservationId harus bilangan bulat positif" }],
    };
  }
  return { ok: true, value: id };
}

export type StaffReservationListStatus = "PENDING" | "APPROVED";

export interface StaffReservationListQuery {
  page: number;
  perPage: number;
  status: StaffReservationListStatus;
}

export function parseStaffReservationListQuery(searchParams: URLSearchParams): ParseResult<StaffReservationListQuery> {
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

  const rawStatus = searchParams.get("status");
  let status: StaffReservationListQuery["status"] = "PENDING";
  if (rawStatus !== null) {
    if (rawStatus !== "PENDING" && rawStatus !== "APPROVED") {
      errors.push({
        field: "status",
        code: "INVALID_STATUS",
        message: "status harus salah satu dari: PENDING, APPROVED",
      });
    } else {
      status = rawStatus;
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      page: page ?? 1,
      perPage: perPage ?? 20,
      status,
    },
  };
}
