import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    idempotencyKey: {
      create: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { claimOrGetIdempotencyKey, deleteIdempotencyClaim, storeIdempotencyResult } from "./idempotency";

const idempotencyKey = vi.mocked(prisma.idempotencyKey);

const identity = {
  key: "11111111-1111-4111-8111-111111111111",
  principalId: 42,
  scope: "POST:/api/reservations",
  requestHash: "abc",
  expiresAt: new Date("2026-09-10T00:00:00Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("claimOrGetIdempotencyKey", () => {
  it("pemilik klaim pertama menjalankan operasi bisnis", async () => {
    const record = {
      id: "00000000-0000-4000-8000-000000000000",
      createdAt: new Date("2026-09-10T00:00:00Z"),
      ...identity,
      responseStatus: null,
      responseBody: null,
    };
    idempotencyKey.create.mockResolvedValue(record);

    const result = await claimOrGetIdempotencyKey(identity);

    expect(result.claimed).toBe(true);
    expect(idempotencyKey.create).toHaveBeenCalledWith({
      data: {
        key: identity.key,
        principalId: identity.principalId,
        scope: identity.scope,
        requestHash: identity.requestHash,
        expiresAt: identity.expiresAt,
      },
    });
  });

  it("duplikat bersamaan mendapat record pemenang dan tidak membuat operasi kedua", async () => {
    const winner = {
      id: "00000000-0000-4000-8000-000000000000",
      createdAt: new Date("2026-09-10T00:00:00Z"),
      ...identity,
      responseStatus: null,
      responseBody: null,
    };
    idempotencyKey.create.mockRejectedValue({ code: "P2002" });
    idempotencyKey.findFirst.mockResolvedValue(winner);

    const result = await claimOrGetIdempotencyKey(identity);

    expect(result.claimed).toBe(false);
    expect(result.record).toEqual(winner);
  });

  it("error selain P2002 diteruskan (bukan dianggap menang/kalah)", async () => {
    idempotencyKey.create.mockRejectedValue(new Error("basis data mati"));

    await expect(claimOrGetIdempotencyKey(identity)).rejects.toThrow("basis data mati");
  });
});

describe("storeIdempotencyResult", () => {
  it("menyimpan hasil dengan guard requestHash milik klaim", async () => {
    await storeIdempotencyResult(identity, { responseStatus: 201, responseBody: { id: 1 } });

    expect(idempotencyKey.updateMany).toHaveBeenCalledWith({
      where: {
        key: identity.key,
        principalId: identity.principalId,
        scope: identity.scope,
        requestHash: identity.requestHash,
      },
      data: { responseStatus: 201, responseBody: { id: 1 } },
    });
  });
});

describe("deleteIdempotencyClaim", () => {
  it("hanya menghapus klaim tanpa hasil agar retry 5xx dapat diproses", async () => {
    await deleteIdempotencyClaim(identity);

    expect(idempotencyKey.deleteMany).toHaveBeenCalledWith({
      where: {
        key: identity.key,
        principalId: identity.principalId,
        scope: identity.scope,
        responseStatus: null,
      },
    });
  });
});
