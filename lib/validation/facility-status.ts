import type { ProblemFieldError } from "@/lib/http/problem";
import {
  STATUS_FASILITAS_OPERASIONAL,
  type StatusFasilitasOperasional,
} from "@/config/business";

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; errors: ProblemFieldError[] };

/**
 * Body PATCH /api/staff/facilities/{facilityId}/status (OpenAPI: StaffFacilityStatusRequest).
 * Hanya ACTIVE dan UNDER_MAINTENANCE yang diterima; INACTIVE milik jalur admin FAC-05.
 */
export function parseFacilityStatusBody(body: unknown): ParseResult<{ status: StatusFasilitasOperasional }> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      ok: false,
      errors: [{ field: "body", code: "INVALID_BODY", message: "Body harus berupa objek JSON" }],
    };
  }

  const rawStatus = (body as Record<string, unknown>).status;
  if (typeof rawStatus !== "string") {
    return {
      ok: false,
      errors: [{ field: "status", code: "REQUIRED", message: "status wajib diisi" }],
    };
  }
  if (!(STATUS_FASILITAS_OPERASIONAL as readonly string[]).includes(rawStatus)) {
    return {
      ok: false,
      errors: [
        {
          field: "status",
          code: "INVALID_ENUM",
          message: "status harus ACTIVE atau UNDER_MAINTENANCE",
        },
      ],
    };
  }

  return { ok: true, value: { status: rawStatus as StatusFasilitasOperasional } };
}
