import { describe, expect, it } from "vitest";

import {
  blockedByLabel,
  getStartTimeOptions,
  getValidEndTimes,
  type AvailabilitySlot,
} from "./slot-range";

function makeSlots(blocked: Record<string, "APPROVED" | "MAINTENANCE"> = {}): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  let h = 7;
  let m = 0;
  while (true) {
    const start = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    m += 30;
    if (m === 60) {
      m = 0;
      h += 1;
    }
    const end = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const blockedBy = blocked[start] ?? null;
    slots.push({ startTime: start, endTime: end, available: blockedBy === null, blockedBy });
    if (end === "20:00") break;
  }
  return slots;
}

describe("getValidEndTimes", () => {
  it("mengembalikan semua waktu setelah jam mulai bila tidak ada slot terblokir", () => {
    const result = getValidEndTimes("09:00", makeSlots());
    expect(result[0]).toBe("09:30");
    expect(result[result.length - 1]).toBe("20:00");
    // 09:00..19:30 mulai = 22 slot, tiap slot menyumbang satu endTime
    expect(result).toHaveLength(22);
  });

  it("berhenti di slot terblokir pertama dan tidak melompatinya", () => {
    const slots = makeSlots({ "10:00": "APPROVED", "10:30": "APPROVED" });
    // dari 09:00 hanya bisa sampai 10:00 (slot 09:00, 09:30 tersedia)
    expect(getValidEndTimes("09:00", slots)).toEqual(["09:30", "10:00"]);
    // dari dalam blokir tidak ada opsi
    expect(getValidEndTimes("10:00", slots)).toEqual([]);
    // setelah blokir bisa lagi
    expect(getValidEndTimes("11:00", slots)[0]).toBe("11:30");
  });

  it("menandai blokir MAINTENANCE sama seperti APPROVED", () => {
    const slots = makeSlots({ "07:00": "MAINTENANCE" });
    expect(getValidEndTimes("07:00", slots)).toEqual([]);
    expect(getValidEndTimes("07:30", slots)[0]).toBe("08:00");
  });

  it("tanpa info ketersediaan mengembalikan semua waktu setelah jam mulai", () => {
    const result = getValidEndTimes("19:30", null);
    expect(result).toEqual(["20:00"]);
    expect(getValidEndTimes("", null)).toEqual([]);
  });

  it("jam mulai yang tidak dikenal tidak punya opsi selesai", () => {
    expect(getValidEndTimes("25:00", makeSlots())).toEqual([]);
  });
});

describe("blockedByLabel", () => {
  it("memetakan alasan blokir ke keterangan singkat", () => {
    expect(blockedByLabel("APPROVED")).toBe("sudah disetujui");
    expect(blockedByLabel("MAINTENANCE")).toBe("dalam perbaikan");
    expect(blockedByLabel(null)).toBeNull();
  });
});

describe("getStartTimeOptions", () => {
  it("memuat semua waktu mulai 07:00..19:30 tiap 30 menit", () => {
    const options = getStartTimeOptions();
    expect(options).toHaveLength(26);
    expect(options[0]).toBe("07:00");
    expect(options[options.length - 1]).toBe("19:30");
  });
});
