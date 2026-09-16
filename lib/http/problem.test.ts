import { describe, expect, it } from "vitest";

import { badRequest, notFound, problemResponse, validationFailed } from "./problem";

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
    const response = validationFailed("/api/facilities", [
      { field: "perPage", code: "OUT_OF_RANGE", message: "perPage harus di antara 1 dan 100" },
    ]);
    const body = await response.json();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].field).toBe("perPage");
    expect(response.status).toBe(422);
  });
});

describe("helper respons", () => {
  it("badRequest mengembalikan status 400", async () => {
    const response = badRequest("/api/facilities");
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("BAD_REQUEST");
  });

  it("notFound mengembalikan status 404", async () => {
    const response = notFound("/api/facilities/999");
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.code).toBe("NOT_FOUND");
  });
});
