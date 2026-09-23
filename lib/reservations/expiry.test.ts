import { beforeEach, describe, expect, it, vi } from "vitest";

import { ALASAN_KEDALUWARSA, expirePendingReservations } from "./expiry";

const updateMany = vi.fn();

function makeClient() {
  return { reservation: { updateMany } } as unknown as Parameters<typeof expirePendingReservations>[0];
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("expirePendingReservations", () => {
  it("mengubah PENDING yang sudah lewat menjadi EXPIRED dengan alasan otomatis", async () => {
    updateMany.mockResolvedValue({ count: 2 });
    const now = new Date("2026-09-15T02:00:00Z");

    const result = await expirePendingReservations(makeClient(), now);

    expect(result).toEqual({ count: 2 });
    expect(updateMany).toHaveBeenCalledWith({
      where: { status: "PENDING", startTime: { lte: now } },
      data: { status: "EXPIRED", alasan: ALASAN_KEDALUWARSA, waktuDiproses: now },
    });
  });

  it("memakai batas inklusif: startsAt tepat sama dengan now ikut kedaluwarsa", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    const now = new Date("2026-09-15T02:00:00Z");

    await expirePendingReservations(makeClient(), now);

    // lte (bukan lt): konsisten dengan kontrak "EXPIRED ketika serverNow >= startsAt"
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PENDING", startTime: { lte: now } } }),
    );
  });

  it("tidak menyentuh status selain PENDING sehingga idempoten", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expirePendingReservations(makeClient());

    // APPROVED/REJECTED/CANCELLED/EXPIRED tidak cocok dengan where,
    // jadi eksekusi berulang tidak menimbulkan efek samping tambahan
    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "PENDING" }) }),
    );
  });

  it("tidak mengubah petugas pemroses (diprosesOleh tetap null)", async () => {
    updateMany.mockResolvedValue({ count: 0 });

    await expirePendingReservations(makeClient(), new Date("2026-09-15T02:00:00Z"));

    const data = updateMany.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect(data).not.toHaveProperty("diprosesOleh");
  });
});
