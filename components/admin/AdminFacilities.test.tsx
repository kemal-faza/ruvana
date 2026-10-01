import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AdminFacility, AdminFacilityCollection } from "@/lib/services/admin-facility-service";

import AdminFacilities from "./AdminFacilities";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const items: AdminFacility[] = [
  {
    id: 1,
    nama: "RK-101",
    tipe: "ruang_kelas",
    lokasi: "Gedung A Lt.1",
    kapasitas: 40,
    deskripsi: null,
    status: "ACTIVE",
    statusChangedAt: null,
    statusChangedBy: null,
  },
  {
    id: 9,
    nama: "Lab Komputer 2",
    tipe: "laboratorium",
    lokasi: "Gedung B Lt.2",
    kapasitas: 30,
    deskripsi: null,
    status: "UNDER_MAINTENANCE",
    statusChangedAt: "2026-09-30T05:00:00.000Z",
    statusChangedBy: { id: 1, nama: "Admin Ruvana", role: "admin" },
  },
];

const meta: AdminFacilityCollection["meta"] = { page: 1, perPage: 20, totalItems: 2, totalPages: 1 };
const filters = {};

function renderFixture(list: AdminFacility[] = items, metaValue: AdminFacilityCollection["meta"] = meta) {
  return render(<AdminFacilities items={list} meta={metaValue} filters={filters} />);
}

afterEach(cleanup);

describe("AdminFacilities", () => {
  it("menampilkan daftar fasilitas dengan label status Indonesia", () => {
    renderFixture();

    expect(screen.getByRole("heading", { level: 1, name: "Kelola fasilitas" })).toBeInTheDocument();
    expect(screen.getByText("RK-101")).toBeInTheDocument();
    expect(screen.getByText("Lab Komputer 2")).toBeInTheDocument();
    expect(screen.getAllByText("Dalam Pemeliharaan").length).toBeGreaterThan(0);
  });

  it("menampilkan keadaan kosong", () => {
    renderFixture([], { page: 1, perPage: 20, totalItems: 0, totalPages: 0 });
    expect(screen.getByText("Tidak ada fasilitas yang cocok.")).toBeInTheDocument();
  });

  it("membuka sheet tambah fasilitas", async () => {
    const user = userEvent.setup();
    renderFixture();

    await user.click(screen.getByRole("button", { name: /Tambah fasilitas/ }));

    expect(await screen.findByRole("heading", { name: "Tambah fasilitas" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nama")).toBeInTheDocument();
  });

  it("membuka sheet ubah status dengan peringatan dampak", async () => {
    const user = userEvent.setup();
    renderFixture();

    await user.click(screen.getAllByRole("button", { name: /Ubah status/ })[0]);

    expect(await screen.findByRole("heading", { name: "Ubah status fasilitas" })).toBeInTheDocument();
    expect(
      screen.getByText(/membatalkan seluruh reservasi yang sudah disetujui/i),
    ).toBeInTheDocument();
  });
});
