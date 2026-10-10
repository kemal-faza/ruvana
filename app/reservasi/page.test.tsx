import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

vi.mock("@/app/reservasi/reservation-content", () => ({
  ReservationContent: () => {
    throw new Promise(() => {});
  },
}));

import { ReservationContentSkeleton } from "@/app/reservasi/reservation-content-skeleton";
import ReservationPage from "@/app/reservasi/page";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ReservationPage", () => {
  it("menampilkan judul halaman dan fallback skeleton selama konten async dimuat", async () => {
    const page = await ReservationPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.getByRole("heading", { name: "Ajukan reservasi" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it("tidak merender shell maupun tautan lewati karena disediakan layout segmen", async () => {
    const page = await ReservationPage({ searchParams: Promise.resolve({}) });
    render(page);

    expect(screen.queryByRole("navigation", { name: "Navigasi utama" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Lewati ke konten utama" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("main")).toHaveLength(1);
  });

  it("lolos pemeriksaan aksesibilitas dasar pada konten halaman", async () => {
    const page = await ReservationPage({ searchParams: Promise.resolve({}) });
    const { container } = render(page);

    expect((await axe(container)).violations).toEqual([]);
  });
});

describe("ReservationContentSkeleton", () => {
  it("mengumumkan loading form", () => {
    render(<ReservationContentSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Memuat form reservasi");
  });
});
