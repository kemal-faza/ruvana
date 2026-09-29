import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const { requirePengguna, listPublicFacilities, computeFacilityAvailability } = vi.hoisted(() => ({
  requirePengguna: vi.fn(),
  listPublicFacilities: vi.fn(),
  computeFacilityAvailability: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePengguna }));
vi.mock("@/lib/services/facility-service", () => ({ listPublicFacilities }));
vi.mock("@/lib/reservations/availability", () => ({ computeFacilityAvailability }));

import ReservasiPage from "@/app/reservasi/page";
import { reservasiNavigation } from "@/app/reservasi/navigation";

beforeEach(() => vi.clearAllMocks());

describe("ReservasiPage", () => {
  it("menjalankan guard pengguna sebelum memuat fasilitas", async () => {
    requirePengguna.mockRejectedValue(new Error("redirect:/login"));

    await expect(
      ReservasiPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("redirect:/login");

    expect(requirePengguna).toHaveBeenCalledOnce();
    expect(listPublicFacilities).not.toHaveBeenCalled();
  });

  it("menampilkan akun sesi pengguna, bukan akun hardcode", async () => {
    requirePengguna.mockResolvedValue({
      id: 42,
      nama: "Siti Aminah",
      email: "siti.aminah@example.com",
      role: Role.pengguna,
    });
    listPublicFacilities.mockResolvedValue({ items: [] });
    computeFacilityAvailability.mockResolvedValue(null);

    const page = await ReservasiPage({ searchParams: Promise.resolve({}) });

    expect(page.props.navigation).toBe(reservasiNavigation);
    expect(page.props.account).toEqual({ displayName: "Siti Aminah", roleLabel: "Pengguna" });
  });
});
