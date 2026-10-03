import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock di lapisan Prisma, bukan di `lib/db`: sehingga `buildPublicFacilityWhere`,
// `findPublicFacilityById`, dan service asli tetap dieksekusi dan `where` yang
// dikirim ketiganya bisa dibandingkan. Meng-mock `lib/db` akan membuat tes ini
// hanya mengulang nilai mock, bukan aturan status publiknya.
const { facilityFindMany, facilityFindFirst, facilityCount, reservationFindMany } = vi.hoisted(() => ({
  facilityFindMany: vi.fn(),
  facilityFindFirst: vi.fn(),
  facilityCount: vi.fn(),
  reservationFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    facility: { findMany: facilityFindMany, findFirst: facilityFindFirst, count: facilityCount },
    reservation: { findMany: reservationFindMany },
  },
}));

import { jakartaDayRangeUtc, jakartaToUtc, parseCalendarDate } from "@/lib/time/jakarta";
import { getFacilityAvailability } from "./availability-service";
import { getPublicFacility, listPublicFacilities } from "./facility-service";

// Nilai harapan ditulis eksplisit dari kriteria FAC-04, bukan diimpor dari
// sumber agar tes gagal bila daftar status publik berubah tanpa sengaja.
const PUBLIC_STATUSES = ["ACTIVE", "UNDER_MAINTENANCE"];
const DATE = "2026-09-18";

const facility = (id: number, status: "ACTIVE" | "UNDER_MAINTENANCE") => ({
  id,
  nama: `Fasilitas ${id}`,
  tipe: "ruang_kelas" as const,
  lokasi: "Gedung A",
  kapasitas: 40,
  deskripsi: null,
  status,
});

function slotAt(slots: { startTime: string; available: boolean; blockedBy: string | null }[], startTime: string) {
  const slot = slots.find((item) => item.startTime === startTime);
  if (!slot) throw new Error(`slot ${startTime} tidak ditemukan`);
  return slot;
}

function calendarDateOrThrow(date: string) {
  const parsed = parseCalendarDate(date);
  if (!parsed) throw new Error(`tanggal uji tidak valid: ${date}`);
  return parsed;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("konsistensi status publik (FAC-04)", () => {
  it("ACTIVE: daftar, count, dan detail memakai filter yang sama; ketersediaan dihitung dari APPROVED", async () => {
    const calendarDate = calendarDateOrThrow(DATE);
    facilityFindMany.mockResolvedValue([facility(1, "ACTIVE")]);
    facilityCount.mockResolvedValue(1);
    facilityFindFirst.mockResolvedValue(facility(1, "ACTIVE"));
    reservationFindMany.mockResolvedValue([
      { startTime: jakartaToUtc(calendarDate, "08:00"), endTime: jakartaToUtc(calendarDate, "09:00") },
    ]);

    const list = await listPublicFacilities({ page: 1, perPage: 20 });
    const detail = await getPublicFacility(1);
    const availability = await getFacilityAvailability(1, DATE);

    expect(list.items.map((item) => item.id)).toEqual([1]);
    expect(detail?.id).toBe(1);
    expect(availability?.slots).toHaveLength(26);
    expect(slotAt(availability?.slots ?? [], "08:00")).toMatchObject({ available: false, blockedBy: "APPROVED" });
    expect(slotAt(availability?.slots ?? [], "08:30")).toMatchObject({ available: false, blockedBy: "APPROVED" });
    expect(slotAt(availability?.slots ?? [], "09:00")).toMatchObject({ available: true, blockedBy: null });

    // Satu aturan status publik untuk daftar, count, dan detail.
    const listWhere = facilityFindMany.mock.calls[0][0].where;
    const countWhere = facilityCount.mock.calls[0][0].where;
    const detailWhere = facilityFindFirst.mock.calls[0][0].where;
    expect(listWhere.status).toEqual({ in: PUBLIC_STATUSES });
    expect(countWhere.status).toEqual(listWhere.status);
    expect(detailWhere).toEqual(expect.objectContaining({ id: 1, status: { in: PUBLIC_STATUSES } }));

    const { start, end } = jakartaDayRangeUtc(calendarDate);
    expect(reservationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          facilityId: 1,
          status: "APPROVED",
          startTime: { lt: end },
          endTime: { gt: start },
        }),
      }),
    );
  });

  it("UNDER_MAINTENANCE: tetap publik dengan seluruh slot tidak tersedia tanpa query reservasi", async () => {
    facilityFindMany.mockResolvedValue([facility(9, "UNDER_MAINTENANCE")]);
    facilityCount.mockResolvedValue(1);
    facilityFindFirst.mockResolvedValue(facility(9, "UNDER_MAINTENANCE"));

    const list = await listPublicFacilities({ page: 1, perPage: 20 });
    const detail = await getPublicFacility(9);
    const availability = await getFacilityAvailability(9, DATE);

    expect(list.items.map((item) => item.id)).toEqual([9]);
    expect(detail?.status).toBe("UNDER_MAINTENANCE");
    expect(availability?.slots).toHaveLength(26);
    expect(availability?.slots.every((slot) => !slot.available && slot.blockedBy === "MAINTENANCE")).toBe(true);
    expect(reservationFindMany).not.toHaveBeenCalled();
  });

  it("INACTIVE: query menyaring status publik sehingga daftar, detail, dan ketersediaan sama-sama tidak ditemukan", async () => {
    facilityFindMany.mockResolvedValue([]);
    facilityCount.mockResolvedValue(0);
    facilityFindFirst.mockResolvedValue(null);

    const list = await listPublicFacilities({ page: 1, perPage: 20 });
    const detail = await getPublicFacility(10);
    const availability = await getFacilityAvailability(10, DATE);

    expect(list.items).toEqual([]);
    expect(detail).toBeNull();
    expect(availability).toBeNull();
    expect(reservationFindMany).not.toHaveBeenCalled();

    // Fasilitas INACTIVE tidak difilter pemanggil: `where` yang sampai ke Prisma
    // tetap hanya memuat daftar status publik, sama seperti daftar dan count.
    expect(facilityFindMany.mock.calls[0][0].where.status).toEqual({ in: PUBLIC_STATUSES });
    expect(facilityFindFirst.mock.calls[0][0].where).toEqual(
      expect.objectContaining({ id: 10, status: { in: PUBLIC_STATUSES } }),
    );
  });
});
