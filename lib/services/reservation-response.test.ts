import { describe, expect, it } from "vitest";

import { toReservationResponse } from "@/lib/services/reservation-service";

function barisPemeliharaan() {
  return {
    id: 77,
    tanggal: new Date(Date.UTC(2027, 5, 15)),
    startTime: new Date("2027-06-15T03:00:00.000Z"),
    endTime: new Date("2027-06-15T04:00:00.000Z"),
    tujuanPenggunaan: "Rapat kerja",
    status: "CANCELLED_BY_OFFICER",
    alasan: "Fasilitas dalam perbaikan terjadwal.",
    createdAt: new Date("2027-06-01T02:00:00.000Z"),
    waktuDiproses: new Date("2027-06-10T01:00:00.000Z"),
    facility: {
      id: 3,
      nama: "Aula Utama",
      tipe: "aula",
      lokasi: "Gedung Serbaguna",
      kapasitas: 300,
      deskripsi: null,
      status: "UNDER_MAINTENANCE",
    },
  };
}

describe("toReservationResponse", () => {
  it("memetakan baris CANCELLED_BY_OFFICER berisi data tanpa error", () => {
    const hasil = toReservationResponse(barisPemeliharaan() as never);

    expect(hasil.status).toBe("CANCELLED_BY_OFFICER");
    expect(hasil.alasan).toBe("Fasilitas dalam perbaikan terjadwal.");
    expect(hasil.processedAt).toBe("2027-06-10T01:00:00.000Z");
    expect(hasil.submittedAt).toBe("2027-06-01T02:00:00.000Z");
    expect(hasil.date).toBe("2027-06-15");
    expect(hasil.startTime).toBe("10:00");
    expect(hasil.endTime).toBe("11:00");
    expect(hasil.facility.deskripsi).toBeNull();
  });

  it("meneruskan semua enum status apa adanya untuk dipetakan label di klien", () => {
    for (const status of [
      "PENDING",
      "APPROVED",
      "REJECTED",
      "CANCELLED_BY_USER",
      "CANCELLED_BY_OFFICER",
      "EXPIRED",
    ]) {
      const hasil = toReservationResponse({ ...barisPemeliharaan(), status } as never);
      expect(hasil.status).toBe(status);
    }
  });

  it("menampilkan null aman untuk field nullable yang kosong", () => {
    const hasil = toReservationResponse({
      ...barisPemeliharaan(),
      status: "PENDING",
      alasan: null,
      waktuDiproses: null,
    } as never);

    expect(hasil.alasan).toBeNull();
    expect(hasil.processedAt).toBeNull();
  });
});
