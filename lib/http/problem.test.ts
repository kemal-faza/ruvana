import { describe, expect, it } from "vitest";

import { badRequest, csrfOriginRejected, forbidden, internalError, notFound, problemResponse, unauthorized, validationFailed } from "./problem";

describe("problemResponse", () => {
  it("menghasilkan bentuk RFC 9457 dengan header yang benar", async () => {
    const response = problemResponse({
      status: 404,
      code: "NOT_FOUND",
      title: "Resource tidak ditemukan",
      detail: "Fasilitas tidak ditemukan",
      instance: "/api/facilities/1",
    });
    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toBe("application/problem+json");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({
      type: "https://ruvana.invalid/problems/not-found",
      title: "Resource tidak ditemukan",
      status: 404,
      detail: "Fasilitas tidak ditemukan",
      instance: "/api/facilities/1",
      code: "NOT_FOUND",
    });
  });

  it("menyertakan errors ketika diberikan", async () => {
    const response = validationFailed("/api/reservations", [{ field: "facilityId", code: "INVALID", message: "salah" }]);
    const body = await response.json();
    expect(body.errors).toHaveLength(1);
    expect(response.status).toBe(422);
  });

  it("menyertakan field perPage untuk validasi query fasilitas", async () => {
    const response = validationFailed("/api/facilities", [
      { field: "perPage", code: "OUT_OF_RANGE", message: "perPage harus di antara 1 dan 100" },
    ]);
    const body = await response.json();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].field).toBe("perPage");
    expect(response.status).toBe(422);
  });

  it("unauthorized mengembalikan 401", async () => {
    const r = unauthorized("/api/reservations");
    expect(r.status).toBe(401);
    const b = await r.json();
    expect(b.code).toBe("UNAUTHORIZED");
  });

  it("forbidden dan csrf menghasilkan 403 dengan code berbeda", async () => {
    const f = forbidden("/api/reservations");
    const c = csrfOriginRejected("/api/reservations");
    expect(f.status).toBe(403);
    expect(c.status).toBe(403);
    const fb = await f.json();
    const cb = await c.json();
    expect(fb.code).toBe("FORBIDDEN");
    expect(cb.code).toBe("CSRF_ORIGIN_REJECTED");
  });
});

describe("helper respons", () => {
  it("badRequest mengembalikan 400", async () => {
    const r = badRequest("/api/reservations");
    expect(r.status).toBe(400);
    const b = await r.json();
    expect(b.code).toBe("BAD_REQUEST");
  });
  it("notFound mengembalikan 404", async () => {
    const r = notFound("/api/reservations/999");
    expect(r.status).toBe(404);
  });
  it("internalError mengembalikan 500", async () => {
    const r = internalError("/api/reservations");
    expect(r.status).toBe(500);
  });
});
