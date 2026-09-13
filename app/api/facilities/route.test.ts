import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { listPublicFacilities } from "@/lib/services/facility-service";

import { GET } from "./route";

vi.mock("@/lib/services/facility-service", () => ({
  listPublicFacilities: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/facilities", () => {
  it("mengembalikan 200 dengan Cache-Control no-store", async () => {
    vi.mocked(listPublicFacilities).mockResolvedValue({
      items: [],
      meta: { page: 1, perPage: 20, totalItems: 0, totalPages: 0 },
    });

    const request = new NextRequest("http://localhost/api/facilities");
    const response = await GET(request);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("mengembalikan 422 VALIDATION_FAILED ketika perPage tidak valid", async () => {
    const request = new NextRequest("http://localhost/api/facilities?perPage=0");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.code).toBe("VALIDATION_FAILED");
    expect(body.errors[0].field).toBe("perPage");
    expect(listPublicFacilities).not.toHaveBeenCalled();
  });
});
