import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  computeFacilityAvailability,
  type AvailabilityClient,
} from "./availability";
import { asiaJakartaToUtc } from "@/lib/time/reservation-time";

type MockStatus = "ACTIVE" | "UNDER_MAINTENANCE" | "INACTIVE";

function makeClient(opts: {
  facility?: { status: MockStatus } | null;
  approved?: Array<{ startTime: Date; endTime: Date }>;
} = {}) {
  const facility =
    opts.facility === undefined
      ? { id: 1, status: "ACTIVE" as MockStatus }
      : opts.facility === null
        ? null
        : { id: 1, status: opts.facility.status };
  const findUnique = vi.fn().mockResolvedValue(facility);
  const findMany = vi.fn().mockResolvedValue(opts.approved ?? []);
  const client = {
    facility: { findUnique },
    reservation: { findMany },
  } as unknown as AvailabilityClient;
  return { client, findUnique, findMany };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("computeFacilityAvailability", () => {
  it("mengembalikan null untuk masukan tidak valid tanpa menyentuh DB", async () => {
    const { client, findUnique, findMany } = makeClient();
    expect(await computeFacilityAvailability(0, "2026-09-15", { client })).toBeNull();
    expect(await computeFacilityAvailability(1, "bukan-tanggal", { client })).toBeNull();
    expect(await computeFacilityAvailability(1, "2026-02-31", { client })).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });

  it("memetakan slot APPROVED dari client saat status belum diketahui", async () => {
    const approved = [
      { startTime: asiaJakartaToUtc("2026-09-15", "09:00"), endTime: asiaJakartaToUtc("2026-09-15", "10:00") },
    ];
    const { client, findUnique } = makeClient({ approved });
    const result = await computeFacilityAvailability(1, "2026-09-15", { client });

    expect(result).not.toBeNull();
    expect(result?.facilityId).toBe(1);
    expect(result?.date).toBe("2026-09-15");
    expect(result?.timezone).toBe("Asia/Jakarta");
    expect(result?.slots).toHaveLength(26);
    expect(findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
    const blocked = result?.slots.filter((s) => !s.available) ?? [];
    expect(blocked.map((s) => s.startTime)).toEqual(["09:00", "09:30"]);
    expect(blocked.every((s) => s.blockedBy === "APPROVED")).toBe(true);
  });

  it("memblokir irisan parsial (predikat overlap tidak berubah)", async () => {
    // 09:15–09:45 menyentuh slot 09:00 dan 09:30, tapi bukan 08:30 / 10:00
    const approved = [
      { startTime: asiaJakartaToUtc("2026-09-15", "09:15"), endTime: asiaJakartaToUtc("2026-09-15", "09:45") },
    ];
    const { client } = makeClient({ approved });
    const result = await computeFacilityAvailability(1, "2026-09-15", { client });
    const byStart = new Map((result?.slots ?? []).map((s) => [s.startTime, s]));
    expect(byStart.get("08:30")?.available).toBe(true);
    expect(byStart.get("09:00")?.available).toBe(false);
    expect(byStart.get("09:30")?.available).toBe(false);
    expect(byStart.get("10:00")?.available).toBe(true);
  });

  it("mengembalikan null bila fasilitas hilang atau INACTIVE", async () => {
    const missing = makeClient({ facility: null });
    expect(await computeFacilityAvailability(1, "2026-09-15", { client: missing.client })).toBeNull();
    expect(missing.findMany).not.toHaveBeenCalled();

    const inactive = makeClient({ facility: { status: "INACTIVE" } });
    expect(await computeFacilityAvailability(1, "2026-09-15", { client: inactive.client })).toBeNull();
    expect(inactive.findMany).not.toHaveBeenCalled();
  });

  it("status yang di-passing membuat query fasilitas dilewati", async () => {
    const approved = [
      { startTime: asiaJakartaToUtc("2026-09-15", "09:00"), endTime: asiaJakartaToUtc("2026-09-15", "09:30") },
    ];
    const { client, findUnique, findMany } = makeClient({ approved });
    const result = await computeFacilityAvailability(1, "2026-09-15", {
      client,
      facilityStatus: "ACTIVE",
    });

    expect(findUnique).not.toHaveBeenCalled();
    expect(findMany).toHaveBeenCalledTimes(1);
    const byStart = new Map((result?.slots ?? []).map((s) => [s.startTime, s]));
    expect(byStart.get("09:00")?.blockedBy).toBe("APPROVED");
    expect(byStart.get("09:30")?.available).toBe(true);
  });

  it("status UNDER_MAINTENANCE yang di-passing memblokir semua slot tanpa query reservasi", async () => {
    const { client, findUnique, findMany } = makeClient();
    const result = await computeFacilityAvailability(1, "2026-09-15", {
      client,
      facilityStatus: "UNDER_MAINTENANCE",
    });

    expect(findUnique).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
    expect(result?.slots).toHaveLength(26);
    expect(result?.slots.every((s) => !s.available && s.blockedBy === "MAINTENANCE")).toBe(true);
  });

  it("status UNDER_MAINTENANCE dari DB memblokir semua slot", async () => {
    const { client, findMany } = makeClient({ facility: { status: "UNDER_MAINTENANCE" } });
    const result = await computeFacilityAvailability(1, "2026-09-15", { client });

    expect(findMany).not.toHaveBeenCalled();
    expect(result?.slots.every((s) => s.blockedBy === "MAINTENANCE")).toBe(true);
  });

  it("status INACTIVE yang di-passing mengembalikan null tanpa query", async () => {
    const { client, findUnique, findMany } = makeClient();
    expect(
      await computeFacilityAvailability(1, "2026-09-15", { client, facilityStatus: "INACTIVE" }),
    ).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
    expect(findMany).not.toHaveBeenCalled();
  });

  it("hanya APPROVED yang memblokir: reservasi batal tidak menutup slot", async () => {
    // Query DB difilter status APPROVED, sehingga reservasi yang dibatalkan
    // petugas (CANCELLED_BY_OFFICER) tidak ikut — slot kembali tersedia.
    const { client, findMany } = makeClient({ approved: [] });
    const result = await computeFacilityAvailability(1, "2026-09-15", { client });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "APPROVED" }) }),
    );
    expect(result?.slots.every((s) => s.available && s.blockedBy === null)).toBe(true);
  });
});
