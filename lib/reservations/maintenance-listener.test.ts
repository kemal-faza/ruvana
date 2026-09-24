import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Prisma } from "@/generated/prisma/client";
import type { FacilityStatusChangedPayload } from "@/lib/facility-status-contract";
import { asiaJakartaToUtc } from "@/lib/time/reservation-time";

import { computeFacilityAvailability, type AvailabilityClient } from "./availability";
import { ALASAN_PERBAIKAN, handleFacilityStatusChanged } from "./maintenance-listener";

interface FakeRow {
  id: number;
  facilityId: number;
  status: string;
  startTime: Date;
  endTime: Date;
  tanggal: Date;
  alasan?: string | null;
  waktuDiproses?: Date | null;
}

const WAKTU = asiaJakartaToUtc("2026-09-14", "10:00");

function makeStore(): FakeRow[] {
  return [
    {
      id: 1,
      facilityId: 1,
      status: "APPROVED",
      startTime: asiaJakartaToUtc("2026-09-15", "09:00"),
      endTime: asiaJakartaToUtc("2026-09-15", "10:00"),
      tanggal: asiaJakartaToUtc("2026-09-15", "00:00"),
    },
    {
      id: 2,
      facilityId: 1,
      status: "APPROVED",
      startTime: asiaJakartaToUtc("2026-09-10", "09:00"),
      endTime: asiaJakartaToUtc("2026-09-10", "10:00"),
      tanggal: asiaJakartaToUtc("2026-09-10", "00:00"),
    },
    {
      id: 3,
      facilityId: 1,
      status: "PENDING",
      startTime: asiaJakartaToUtc("2026-09-15", "11:00"),
      endTime: asiaJakartaToUtc("2026-09-15", "12:00"),
      tanggal: asiaJakartaToUtc("2026-09-15", "00:00"),
    },
    {
      id: 4,
      facilityId: 2,
      status: "APPROVED",
      startTime: asiaJakartaToUtc("2026-09-15", "09:00"),
      endTime: asiaJakartaToUtc("2026-09-15", "10:00"),
      tanggal: asiaJakartaToUtc("2026-09-15", "00:00"),
    },
    {
      id: 5,
      facilityId: 1,
      status: "APPROVED",
      startTime: WAKTU,
      endTime: asiaJakartaToUtc("2026-09-14", "10:30"),
      tanggal: asiaJakartaToUtc("2026-09-14", "00:00"),
    },
  ];
}

interface FakeWhere {
  facilityId?: number;
  status?: string;
  startTime?: { gt?: Date };
}

function makeTx(store: FakeRow[]) {
  const updateMany = vi.fn(async (args: { where: FakeWhere; data: Partial<FakeRow> }) => {
    let count = 0;
    for (const row of store) {
      if (args.where.facilityId !== undefined && row.facilityId !== args.where.facilityId) continue;
      if (args.where.status !== undefined && row.status !== args.where.status) continue;
      if (args.where.startTime?.gt !== undefined && !(row.startTime > args.where.startTime.gt)) continue;
      Object.assign(row, args.data);
      count += 1;
    }
    return { count };
  });
  const tx = { reservation: { updateMany } } as unknown as Prisma.TransactionClient;
  return { tx, updateMany };
}

function makeAvailabilityClient(store: FakeRow[]) {
  return {
    facility: {
      findUnique: async (args: { where: { id: number } }) => ({ id: args.where.id, status: "ACTIVE" }),
    },
    reservation: {
      findMany: async (args: {
        where: { facilityId: number; status: string; tanggal?: { gte: Date; lt: Date } };
      }) =>
        store
          .filter(
            (row) =>
              row.facilityId === args.where.facilityId &&
              row.status === args.where.status &&
              (!args.where.tanggal ||
                (row.tanggal >= args.where.tanggal.gte && row.tanggal < args.where.tanggal.lt)),
          )
          .map((row) => ({ startTime: row.startTime, endTime: row.endTime })),
    },
  } as unknown as AvailabilityClient;
}

function makePayload(overrides: Partial<FacilityStatusChangedPayload> = {}): FacilityStatusChangedPayload {
  return { facilityId: 1, statusBaru: "UNDER_MAINTENANCE", waktu: WAKTU, diubahOleh: 7, ...overrides };
}

function byId(store: FakeRow[], id: number): FakeRow {
  const row = store.find((r) => r.id === id);
  if (!row) throw new Error(`baris ${id} hilang`);
  return row;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleFacilityStatusChanged", () => {
  it("membatalkan hanya APPROVED masa depan pada fasilitas pemicu", async () => {
    const store = makeStore();
    const { tx, updateMany } = makeTx(store);

    const result = await handleFacilityStatusChanged(tx, makePayload());

    expect(result).toEqual({ count: 1 });
    expect(updateMany).toHaveBeenCalledWith({
      where: { facilityId: 1, status: "APPROVED", startTime: { gt: WAKTU } },
      data: { status: "CANCELLED_BY_OFFICER", alasan: ALASAN_PERBAIKAN, waktuDiproses: WAKTU },
    });
    expect(byId(store, 1)).toMatchObject({
      status: "CANCELLED_BY_OFFICER",
      alasan: ALASAN_PERBAIKAN,
      waktuDiproses: WAKTU,
    });
    expect("diprosesOleh" in byId(store, 1)).toBe(false);
    expect(byId(store, 2).status).toBe("APPROVED");
    expect(byId(store, 3).status).toBe("PENDING");
    expect(byId(store, 4).status).toBe("APPROVED");
    expect(byId(store, 5).status).toBe("APPROVED");
  });

  it("tidak melakukan apa-apa untuk status selain UNDER_MAINTENANCE", async () => {
    const store = makeStore();
    const { tx, updateMany } = makeTx(store);

    for (const statusBaru of ["ACTIVE", "INACTIVE"] as const) {
      const result = await handleFacilityStatusChanged(tx, makePayload({ statusBaru }));
      expect(result).toEqual({ count: 0 });
    }

    expect(updateMany).not.toHaveBeenCalled();
    expect(store.every((row) => row.status !== "CANCELLED_BY_OFFICER")).toBe(true);
  });

  it("idempoten: pemicu kedua tidak error dan tidak memproses ulang", async () => {
    const store = makeStore();
    const { tx } = makeTx(store);
    const payload = makePayload();

    const first = await handleFacilityStatusChanged(tx, payload);
    const snapshot = structuredClone(byId(store, 1));
    const second = await handleFacilityStatusChanged(tx, payload);

    expect(first).toEqual({ count: 1 });
    expect(second).toEqual({ count: 0 });
    expect(byId(store, 1)).toEqual(snapshot);
  });

  it("slot kembali tersedia setelah listener berjalan", async () => {
    const store = makeStore();
    const { tx } = makeTx(store);
    const client = makeAvailabilityClient(store);

    await handleFacilityStatusChanged(tx, makePayload());

    const fasilitasTerdampak = await computeFacilityAvailability(1, "2026-09-15", {
      client,
      facilityStatus: "ACTIVE",
    });
    const slot = new Map((fasilitasTerdampak?.slots ?? []).map((s) => [s.startTime, s]));
    expect(slot.get("09:00")).toMatchObject({ available: true, blockedBy: null });
    expect(slot.get("09:30")).toMatchObject({ available: true, blockedBy: null });

    const fasilitasLain = await computeFacilityAvailability(2, "2026-09-15", {
      client,
      facilityStatus: "ACTIVE",
    });
    const slotLain = new Map((fasilitasLain?.slots ?? []).map((s) => [s.startTime, s]));
    expect(slotLain.get("09:00")).toMatchObject({ available: false, blockedBy: "APPROVED" });
  });
});
