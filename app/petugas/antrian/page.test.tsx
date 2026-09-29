import { beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const { requirePetugasAtauAdmin } = vi.hoisted(() => ({
  requirePetugasAtauAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePetugasAtauAdmin }));

import AntrianPage from "@/app/petugas/antrian/page";
import { staffNavigation, staffQueueNavigation } from "@/components/staff/navigation";

beforeEach(() => vi.clearAllMocks());

describe("AntrianPage", () => {
  it("meneruskan redirect guard sebelum merender antrean", async () => {
    requirePetugasAtauAdmin.mockRejectedValue(new Error("redirect:/login"));

    await expect(AntrianPage()).rejects.toThrow("redirect:/login");

    expect(requirePetugasAtauAdmin).toHaveBeenCalledOnce();
  });

  it("menampilkan navigasi petugas dan akun sesi untuk role petugas", async () => {
    requirePetugasAtauAdmin.mockResolvedValue({
      id: 7,
      nama: "Petugas Kampus",
      email: "petugas@ruvana.test",
      role: Role.petugas,
    });

    const page = await AntrianPage();

    expect(page.props.navigation).toBe(staffNavigation);
    expect(page.props.account).toEqual({ displayName: "Petugas Kampus", roleLabel: "Petugas" });
  });

  it("tetap mengizinkan admin tanpa menambah menu antrean ke navigasi admin", async () => {
    requirePetugasAtauAdmin.mockResolvedValue({
      id: 1,
      nama: "Admin Kampus",
      email: "admin@ruvana.test",
      role: Role.admin,
    });

    const page = await AntrianPage();

    expect(page.props.navigation).toBe(staffQueueNavigation);
    expect(page.props.account).toEqual({ displayName: "Admin Kampus", roleLabel: "Admin" });
  });
});
