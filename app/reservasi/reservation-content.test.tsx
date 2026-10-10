import { beforeEach, describe, expect, it, vi } from "vitest";

const { listPublicFacilities, computeFacilityAvailability } = vi.hoisted(() => ({
  listPublicFacilities: vi.fn(),
  computeFacilityAvailability: vi.fn(),
}));

vi.mock("@/lib/services/facility-service", () => ({ listPublicFacilities }));
vi.mock("@/lib/reservations/availability", () => ({ computeFacilityAvailability }));

import { ReservationContent } from "./reservation-content";

const items = [
  { id: 2, nama: "Aula Utama", tipe: "aula", status: "ACTIVE", lokasi: "Gedung Serbaguna" },
  { id: 1, nama: "RK-101", tipe: "ruang_kelas", status: "ACTIVE", lokasi: "Gedung A Lt.1" },
  { id: 3, nama: "Lab Komputer 2", tipe: "laboratorium", status: "UNDER_MAINTENANCE", lokasi: "Gedung B" },
];

beforeEach(() => {
  vi.clearAllMocks();
  listPublicFacilities.mockResolvedValue({ items });
  computeFacilityAvailability.mockResolvedValue(null);
});

describe("ReservationContent", () => {
  it("menyaring fasilitas ACTIVE sesuai tipe dari query", async () => {
    const element = await ReservationContent({ searchParams: Promise.resolve({ type: "aula" }) });

    expect(element.props.facilities).toEqual([
      { id: 2, nama: "Aula Utama", lokasi: "Gedung Serbaguna" },
    ]);
  });

  it("mengabaikan tipe yang tidak dikenal dan tetap menampilkan semua fasilitas ACTIVE", async () => {
    const element = await ReservationContent({
      searchParams: Promise.resolve({ type: "tidak-dikenal" }),
    });

    expect(element.props.facilities.map((f: { id: number }) => f.id)).toEqual([2, 1]);
  });

  it("meneruskan tanggal dari query ke form dan perhitungan ketersediaan", async () => {
    const element = await ReservationContent({
      searchParams: Promise.resolve({ date: "2026-10-01" }),
    });

    expect(element.props.date).toBe("2026-10-01");
    expect(computeFacilityAvailability).toHaveBeenCalledWith(2, "2026-10-01");
  });

  it("meneruskan waktu server ke form sebagai dasar jendela 14 hari", async () => {
    const element = await ReservationContent({
      searchParams: Promise.resolve({ date: "2026-10-01" }),
    });

    expect(typeof element.props.serverNow).toBe("string");
    expect(Number.isNaN(Date.parse(element.props.serverNow))).toBe(false);
  });

  it("meneruskan jam mulai valid dari tautan slot sebagai nilai awal form", async () => {
    const element = await ReservationContent({
      searchParams: Promise.resolve({ date: "2026-10-01", startTime: "08:00" }),
    });

    expect(element.props.initialStartTime).toBe("08:00");
  });

  it("mengabaikan jam mulai yang tidak termasuk slot valid", async () => {
    const element = await ReservationContent({
      searchParams: Promise.resolve({ date: "2026-10-01", startTime: "08:07" }),
    });

    expect(element.props.initialStartTime).toBeUndefined();
  });

  it("memakai default H+15 kalender Asia/Jakarta agar slot lolos batas pengajuan", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-01T10:00:00.000Z")); // 17.00 WIB 1 Okt
    try {
      const element = await ReservationContent({ searchParams: Promise.resolve({}) });

      expect(element.props.date).toBe("2026-10-16");
      expect(element.props.serverNow).toBe("2026-10-01T10:00:00.000Z");
    } finally {
      vi.useRealTimers();
    }
  });
});
