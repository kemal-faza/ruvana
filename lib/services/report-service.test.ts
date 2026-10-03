import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createReport as createReportRow,
  findFacilityById,
  findReportByFoto,
  findReportFacilityOptions,
  findUsersById,
} from "@/lib/db/reports";
import { removeReportPhoto, verifyReportPhotoUpload } from "@/lib/storage/report-photo";

import { createReport, listReportFacilityOptions } from "./report-service";

vi.mock("@/lib/db/reports", () => ({
  createReport: vi.fn(),
  findFacilityById: vi.fn(),
  findReportByFoto: vi.fn(),
  findReportFacilityOptions: vi.fn(),
  findUsersById: vi.fn(),
}));

vi.mock("@/lib/storage/report-photo", () => ({
  isOwnedReportPhotoPathname: vi.fn(() => true),
  removeReportPhoto: vi.fn(),
  verifyReportPhotoUpload: vi.fn(),
}));

const mockFacility = {
  id: 1,
  nama: "RK-101",
  tipe: "ruang_kelas" as const,
  lokasi: "Gedung A Lt.1",
  kapasitas: 40,
  status: "ACTIVE" as const,
};

const mockRow = {
  id: 1,
  userId: 1,
  facilityId: 1,
  kategori: "Listrik",
  deskripsi: "AC rusak",
  foto: "reports/1/123e4567-e89b-42d3-a456-426614174000.jpg",
  fotoContentType: "image/jpeg",
  fotoSize: 3,
  status: "NEW" as const,
  catatanResolusi: null,
  ditanganiOleh: null,
  createdAt: new Date("2026-09-01T08:00:00Z"),
  updatedAt: new Date("2026-09-01T08:00:00Z"),
  facility: mockFacility,
};

const input = {
  userId: 1,
  facilityId: 1,
  kategori: "Listrik",
  deskripsi: "AC rusak",
  foto: {
    pathname: "reports/1/123e4567-e89b-42d3-a456-426614174000.jpg",
    contentType: "image/jpeg",
    size: 3,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(findFacilityById).mockResolvedValue(mockFacility);
  vi.mocked(findReportByFoto).mockResolvedValue(null);
  vi.mocked(verifyReportPhotoUpload).mockResolvedValue({
    contentType: "image/jpeg",
    size: 3,
  });
});

describe("createReport membersihkan foto saat insert gagal", () => {
  it("melempar error dan menghapus file yang sudah ditulis (anti-orphan)", async () => {
    const error = new Error("koneksi database terputus");
    vi.mocked(createReportRow).mockRejectedValue(error);

    await expect(createReport(input)).rejects.toThrow("koneksi database terputus");
    expect(removeReportPhoto).toHaveBeenCalledWith(input.foto.pathname, input.userId);
  });

  it("mempertahankan foto ketika laporan berhasil dibuat", async () => {
    vi.mocked(createReportRow).mockResolvedValue(mockRow);
    vi.mocked(findUsersById).mockResolvedValue([]);

    const result = await createReport(input);

    expect(result.ok).toBe(true);
    expect(removeReportPhoto).not.toHaveBeenCalled();
    if (result.ok) {
      expect(result.item.fotoUrl).toBe("/api/reports/1/photo");
      expect(result.item.status).toBe("NEW");
    }
  });
});

describe("listReportFacilityOptions", () => {
  it("meneruskan opsi fasilitas dari lapisan data apa adanya", async () => {
    vi.mocked(findReportFacilityOptions).mockResolvedValue([mockFacility]);

    const options = await listReportFacilityOptions();

    expect(options).toEqual([mockFacility]);
  });
});
