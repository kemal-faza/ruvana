import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Role } from "@/generated/prisma/enums";

const { requirePengguna } = vi.hoisted(() => ({
  requirePengguna: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ requirePengguna }));
vi.mock("@/app/reservasi/reservation-content", () => ({
  ReservationContent: () => {
    throw new Promise(() => {});
  },
}));
vi.mock("next/navigation", () => ({
  usePathname: () => "/reservasi",
}));

import { ReservationContentSkeleton } from "@/app/reservasi/reservation-content-skeleton";
import ReservationPage from "@/app/reservasi/page";
import { reservasiNavigation } from "@/app/reservasi/navigation";

const pengguna = {
  id: 42,
  nama: "Siti Aminah",
  email: "siti.aminah@example.com",
  role: Role.pengguna,
};

beforeEach(() => {
  vi.clearAllMocks();
  requirePengguna.mockResolvedValue(pengguna);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ReservationPage", () => {
  it("menjalankan guard pengguna sebelum membuat halaman", async () => {
    requirePengguna.mockRejectedValue(new Error("redirect:/login"));

    await expect(
      ReservationPage({ searchParams: Promise.resolve({}) }),
    ).rejects.toThrow("redirect:/login");

    expect(requirePengguna).toHaveBeenCalledOnce();
  });

  it("membawa tipe dan tanggal pencarian ke tujuan login", async () => {
    await ReservationPage({
      searchParams: Promise.resolve({ type: "aula", date: "2026-10-04", ignored: "value" }),
    });

    expect(requirePengguna).toHaveBeenCalledWith("/reservasi?type=aula&date=2026-10-04");
  });

  it("menampilkan akun sesi pengguna, bukan akun hardcode", async () => {
    const page = await ReservationPage({ searchParams: Promise.resolve({}) });

    expect(page.props.navigation).toBe(reservasiNavigation);
    expect(page.props.account).toEqual({ displayName: "Siti Aminah", roleLabel: "Pengguna" });
  });

  it("menampilkan shell dan fallback skeleton selama konten async dimuat", async () => {
    const page = await ReservationPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByRole("heading", { name: "Ajukan reservasi" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });
});

describe("ReservationContentSkeleton", () => {
  it("mengumumkan loading form", () => {
    render(<ReservationContentSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Memuat form reservasi");
  });
});
