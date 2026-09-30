import { beforeEach, describe, expect, it, vi } from "vitest";

import { findApprovedIntervals } from "@/lib/db/availability";
import { findPublicFacilityById } from "@/lib/db/facilities";

import { getFacilityAvailability } from "./availability-service";

vi.mock("@/lib/db/facilities", () => ({
  findPublicFacilityById: vi.fn(),
}));

vi.mock("@/lib/db/availability", () => ({
  findApprovedIntervals: vi.fn(),
}));

const activeFacility = {
  id: 1,
  nama: "RK-101",
  tipe: "ruang_kelas" as const,
  lokasi: "Gedung A Lt.1",
  kapasitas: 40,
  deskripsi: "Ruang kelas standar",
  status: "ACTIVE" as const,
};

const maintenanceFacility = { ...activeFacility, status: "UNDER_MAINTENANCE" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getFacilityAvailability", () => {
  it("mengembalikan null untuk fasilitas INACTIVE/tidak ada tanpa query reservasi", async () => {
    vi.mocked(findPublicFacilityById).mockResolvedValue(null);

    const result = await getFacilityAvailability(999, "2026-09-15");

    expect(result).toBeNull();
    expect(findApprovedIntervals).not.toHaveBeenCalled();
  });

  it("mengembalikan 26 slot MAINTENANCE tanpa query reservasi ketika fasilitas UNDER_MAINTENANCE", async () => {
    vi.mocked(findPublicFacilityById).mockResolvedValue(maintenanceFacility);

    const result = await getFacilityAvailability(1, "2026-09-15");

    expect(result?.slots).toHaveLength(26);
    expect(result?.slots.every((slot) => !slot.available && slot.blockedBy === "MAINTENANCE")).toBe(true);
    expect(findApprovedIntervals).not.toHaveBeenCalled();
  });

  it("memanggil db dengan status APPROVED dan rentang UTC hari WIB", async () => {
    vi.mocked(findPublicFacilityById).mockResolvedValue(activeFacility);
    vi.mocked(findApprovedIntervals).mockResolvedValue([]);

    await getFacilityAvailability(1, "2026-09-15");

    expect(findApprovedIntervals).toHaveBeenCalledWith(
      1,
      new Date("2026-09-14T17:00:00.000Z"),
      new Date("2026-09-15T17:00:00.000Z"),
    );
  });

  it("mengembalikan facilityId, date, dan timezone Asia/Jakarta", async () => {
    vi.mocked(findPublicFacilityById).mockResolvedValue(activeFacility);
    vi.mocked(findApprovedIntervals).mockResolvedValue([]);

    const result = await getFacilityAvailability(1, "2026-09-15");

    expect(result?.facilityId).toBe(1);
    expect(result?.date).toBe("2026-09-15");
    expect(result?.timezone).toBe("Asia/Jakarta");
  });

  it("payload slot tidak memuat identitas atau tujuan pemesan", async () => {
    vi.mocked(findPublicFacilityById).mockResolvedValue(activeFacility);
    vi.mocked(findApprovedIntervals).mockResolvedValue([
      { startTime: new Date("2026-09-15T01:00:00.000Z"), endTime: new Date("2026-09-15T02:00:00.000Z") },
    ]);

    const result = await getFacilityAvailability(1, "2026-09-15");

    for (const slot of result?.slots ?? []) {
      expect(Object.keys(slot).sort()).toEqual(["available", "blockedBy", "endTime", "startTime"]);
    }
  });
});
