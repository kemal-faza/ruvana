import type { ProblemFieldError } from "@/lib/http/problem";

export interface PublicListQuery {
  page: number;
  perPage: number;
}

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ProblemFieldError[] };

function parsePositiveInt(raw: string | null): number | null {
  if (raw === null) return null;
  if (!/^\d+$/.test(raw)) return NaN;
  return Number(raw);
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

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      page: page ?? 1,
      perPage: perPage ?? 20,
    },
  };
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
