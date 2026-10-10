import { beforeEach, describe, expect, it, vi } from "vitest";

const { countMyReservations, listMyReservations, expirePendingReservations } = vi.hoisted(() => ({
  countMyReservations: vi.fn(),
  listMyReservations: vi.fn(),
  expirePendingReservations: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/reservations/expiry", () => ({ expirePendingReservations }));
vi.mock("@/lib/db/reservations", () => ({ countMyReservations, listMyReservations }));

import { getMaintenanceCancellationSummaryService } from "./reservation-service";

beforeEach(() => vi.clearAllMocks());

describe("getMaintenanceCancellationSummaryService", () => {
  it("memakai total hitungan server dan contoh nama fasilitas terbaru", async () => {
    countMyReservations.mockResolvedValue(7);
    listMyReservations.mockResolvedValue([
      { facility: { nama: "Aula Utama" } },
      { facility: { nama: "Lab Kimia" } },
      { facility: { nama: "RK-101" } },
    ]);

    const ringkasan = await getMaintenanceCancellationSummaryService(42);

    expect(ringkasan).toEqual({
      total: 7,
      namaFasilitas: ["Aula Utama", "Lab Kimia", "RK-101"],
    });
    expect(expirePendingReservations).toHaveBeenCalled();
    // Hitungan dan contoh dibatasi status pembatalan pemeliharaan, dan `total`
    // berasal dari count — bukan dari jumlah baris contoh yang diambil.
    expect(countMyReservations).toHaveBeenCalledWith({
      userId: 42,
      status: "CANCELLED_BY_MAINTENANCE",
    });
    expect(listMyReservations).toHaveBeenCalledWith({
      userId: 42,
      status: "CANCELLED_BY_MAINTENANCE",
      skip: 0,
      take: 3,
    });
  });

  it("mengembalikan total nol tanpa contoh saat tidak ada pembatalan pemeliharaan", async () => {
    countMyReservations.mockResolvedValue(0);
    listMyReservations.mockResolvedValue([]);

    await expect(getMaintenanceCancellationSummaryService(7)).resolves.toEqual({
      total: 0,
      namaFasilitas: [],
    });
  });
});
