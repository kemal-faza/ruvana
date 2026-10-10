import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Role, StatusFasilitas } from "@/generated/prisma/enums";

const { requirePetugasAtauAdmin, listStaffFacilitiesService } = vi.hoisted(() => ({
  requirePetugasAtauAdmin: vi.fn(),
  listStaffFacilitiesService: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePetugasAtauAdmin }));
vi.mock("@/lib/services/facility-service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/services/facility-service")>()),
  listStaffFacilitiesService,
}));
vi.mock("@/components/staff/facility-status-list", () => ({
  FacilityStatusList: ({ facilities, sorotFacilityId }: { facilities: unknown[]; sorotFacilityId?: number | null }) => (
    <ul aria-label="Daftar status fasilitas" data-sorot={sorotFacilityId ?? ""}>
      {facilities.map((facility) => (
        <li key={String((facility as { id: number }).id)}>
          {(facility as { nama: string }).nama} · {(facility as { status: string }).status}
        </li>
      ))}
    </ul>
  ),
}));

import FasilitasPage from "@/app/petugas/fasilitas/page";

const petugas = {
  id: 7,
  nama: "Petugas Kampus",
  email: "petugas@ruvana.test",
  role: Role.petugas,
};

beforeEach(() => {
  vi.clearAllMocks();
  requirePetugasAtauAdmin.mockResolvedValue(petugas);
  listStaffFacilitiesService.mockResolvedValue([]);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("FasilitasPage", () => {
  it("meneruskan guard petugas sebelum membaca fasilitas", async () => {
    requirePetugasAtauAdmin.mockRejectedValue(new Error("redirect:/login"));

    await expect(FasilitasPage()).rejects.toThrow("redirect:/login");

    expect(requirePetugasAtauAdmin).toHaveBeenCalledOnce();
    expect(listStaffFacilitiesService).not.toHaveBeenCalled();
  });

  it("menampilkan judul status fasilitas tanpa caption pendamping", async () => {
    render(await FasilitasPage());

    expect(screen.getByRole("heading", { level: 1, name: "Status fasilitas" })).toBeInTheDocument();
    expect(screen.queryByText(/dibatalkan otomatis/)).not.toBeInTheDocument();
  });

  it("merender daftar fasilitas dari service petugas", async () => {
    listStaffFacilitiesService.mockResolvedValue([
      {
        id: 1,
        nama: "RK-101",
        tipe: "ruang_kelas",
        lokasi: "Gedung A Lt.1",
        kapasitas: 40,
        deskripsi: null,
        status: StatusFasilitas.UNDER_MAINTENANCE,
        statusChangedAt: null,
        statusChangedBy: null,
      },
    ]);

    render(await FasilitasPage());

    const daftar = screen.getByRole("list", { name: "Daftar status fasilitas" });
    expect(daftar).toHaveTextContent("RK-101 · UNDER_MAINTENANCE");
  });

  it("meneruskan facilityId valid ke sorotan daftar", async () => {
    render(await FasilitasPage({ searchParams: Promise.resolve({ facilityId: "3" }) }));

    expect(screen.getByRole("list", { name: "Daftar status fasilitas" })).toHaveAttribute("data-sorot", "3");
  });

  it("memakai elemen pertama saat facilityId berupa array", async () => {
    render(await FasilitasPage({ searchParams: Promise.resolve({ facilityId: ["3", "5"] }) }));

    expect(screen.getByRole("list", { name: "Daftar status fasilitas" })).toHaveAttribute("data-sorot", "3");
  });

  it("mengabaikan facilityId tak valid tanpa sorotan", async () => {
    for (const facilityId of ["nol", "0", "-2", "3.5"]) {
      const { unmount } = render(
        await FasilitasPage({ searchParams: Promise.resolve({ facilityId }) }),
      );

      expect(screen.getByRole("list", { name: "Daftar status fasilitas" })).toHaveAttribute("data-sorot", "");
      unmount();
      cleanup();
    }
  });
});
