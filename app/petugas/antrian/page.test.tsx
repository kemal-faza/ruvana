import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const { requirePetugasAtauAdmin } = vi.hoisted(() => ({
  requirePetugasAtauAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePetugasAtauAdmin }));
vi.mock("@/components/staff/approved-reservation-list", () => ({ ApprovedReservationList: () => null }));
vi.mock("@/components/staff/reservation-queue", () => ({ ReservationQueue: () => null }));

import AntrianPage from "@/app/petugas/antrian/page";

beforeEach(() => vi.clearAllMocks());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AntrianPage", () => {
  it("meneruskan redirect guard sebelum merender antrean", async () => {
    requirePetugasAtauAdmin.mockRejectedValue(new Error("redirect:/login"));

    await expect(AntrianPage()).rejects.toThrow("redirect:/login");

    expect(requirePetugasAtauAdmin).toHaveBeenCalledOnce();
  });

  it.each([Role.petugas, Role.admin])("merender konten antrean setelah guard untuk role %s", async (role) => {
    requirePetugasAtauAdmin.mockResolvedValue({
      id: role === Role.admin ? 1 : 7,
      nama: role === Role.admin ? "Admin Kampus" : "Petugas Kampus",
      email: role === Role.admin ? "admin@ruvana.test" : "petugas@ruvana.test",
      role,
    });

    render(await AntrianPage());

    expect(screen.getByRole("heading", { name: "Antrean reservasi" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Pembatalan mendesak" })).toBeInTheDocument();
    expect(requirePetugasAtauAdmin).toHaveBeenCalledOnce();
  });
});
