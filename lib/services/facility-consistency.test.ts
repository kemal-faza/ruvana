import { beforeEach, describe, expect, it, vi } from "vitest";

import { countPublicFacilities, findPublicFacilities, findPublicFacilityById } from "@/lib/db/facilities";
import { findApprovedIntervals } from "@/lib/db/availability";
import { jakartaDayRangeUtc, jakartaToUtc, parseCalendarDate } from "@/lib/time/jakarta";
import { getPublicFacility, listPublicFacilities } from "./facility-service";
import { getFacilityAvailability } from "./availability-service";

vi.mock("@/lib/db/facilities", () => ({
  findPublicFacilities: vi.fn(),
  countPublicFacilities: vi.fn(),
  findPublicFacilityById: vi.fn(),
}));

vi.mock("@/lib/db/availability", () => ({
  findApprovedIntervals: vi.fn(),
}));

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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("konsistensi status publik (FAC-04)", () => {
  it("ACTIVE: tampil di daftar, detail, dan ketersediaannya dihitung dari APPROVED", async () => {
    vi.mocked(findPublicFacilities).mockResolvedValue([facility(1, "ACTIVE")]);
    vi.mocked(countPublicFacilities).mockResolvedValue(1);
    vi.mocked(findPublicFacilityById).mockResolvedValue(facility(1, "ACTIVE"));

    const calendarDate = parseCalendarDate(DATE);
    if (!calendarDate) throw new Error("tanggal uji tidak valid");
    vi.mocked(findApprovedIntervals).mockResolvedValue([
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

    const { start, end } = jakartaDayRangeUtc(calendarDate);
    expect(findApprovedIntervals).toHaveBeenCalledWith(1, start, end);
  });

  it("UNDER_MAINTENANCE: tetap publik dengan seluruh slot tidak tersedia", async () => {
    vi.mocked(findPublicFacilities).mockResolvedValue([facility(9, "UNDER_MAINTENANCE")]);
    vi.mocked(countPublicFacilities).mockResolvedValue(1);
    vi.mocked(findPublicFacilityById).mockResolvedValue(facility(9, "UNDER_MAINTENANCE"));

    const list = await listPublicFacilities({ page: 1, perPage: 20 });
    const detail = await getPublicFacility(9);
    const availability = await getFacilityAvailability(9, DATE);

    expect(list.items.map((item) => item.id)).toEqual([9]);
    expect(detail?.status).toBe("UNDER_MAINTENANCE");
    expect(availability?.slots).toHaveLength(26);
    expect(availability?.slots.every((slot) => !slot.available && slot.blockedBy === "MAINTENANCE")).toBe(true);
    expect(findApprovedIntervals).not.toHaveBeenCalled();
  });

  it("INACTIVE: hilang dari daftar, detail dan ketersediaan sama-sama not found", async () => {
    vi.mocked(findPublicFacilities).mockResolvedValue([]);
    vi.mocked(countPublicFacilities).mockResolvedValue(0);
    vi.mocked(findPublicFacilityById).mockResolvedValue(null);

    const list = await listPublicFacilities({ page: 1, perPage: 20 });
    const detail = await getPublicFacility(10);
    const availability = await getFacilityAvailability(10, DATE);

    expect(list.items).toEqual([]);
    expect(detail).toBeNull();
    expect(availability).toBeNull();
    expect(findApprovedIntervals).not.toHaveBeenCalled();
  });

  it("kembali ACTIVE menghitung ulang dari APPROVED, bukan membuka semua slot", async () => {
    vi.mocked(findPublicFacilityById).mockResolvedValue(facility(1, "ACTIVE"));

    const calendarDate = parseCalendarDate(DATE);
    if (!calendarDate) throw new Error("tanggal uji tidak valid");
    vi.mocked(findApprovedIntervals).mockResolvedValue([
      { startTime: jakartaToUtc(calendarDate, "14:00"), endTime: jakartaToUtc(calendarDate, "15:00") },
    ]);

    const availability = await getFacilityAvailability(1, DATE);

    expect(slotAt(availability?.slots ?? [], "14:00")).toMatchObject({ available: false, blockedBy: "APPROVED" });
    expect(slotAt(availability?.slots ?? [], "14:30")).toMatchObject({ available: false, blockedBy: "APPROVED" });
    expect(slotAt(availability?.slots ?? [], "15:00")).toMatchObject({ available: true, blockedBy: null });
    expect(availability?.slots.some((slot) => slot.blockedBy === "MAINTENANCE")).toBe(false);
  });
});
