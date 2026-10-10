import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
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
    fotoUrl: null,
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
    fotoUrl: null,
    statusChangedAt: "2026-09-30T05:00:00.000Z",
    statusChangedBy: { id: 1, nama: "Admin Ruvana", role: "admin" },
  },
];

const meta: AdminFacilityCollection["meta"] = { page: 1, perPage: 20, totalItems: 2, totalPages: 1 };
const filters = {};
const locations = ["Gedung A Lt.1", "Gedung B Lt.2"];

function renderFixture(list: AdminFacility[] = items, metaValue: AdminFacilityCollection["meta"] = meta) {
  return render(<AdminFacilities items={list} meta={metaValue} locations={locations} filters={filters} />);
}

afterEach(cleanup);

describe("AdminFacilities", () => {
  it("menampilkan daftar fasilitas dengan label status Indonesia", () => {
    renderFixture();

    expect(screen.getByRole("heading", { level: 1, name: "Kelola fasilitas" })).toBeInTheDocument();
    expect(screen.getByText("RK-101")).toBeInTheDocument();
    expect(screen.getByText("Lab Komputer 2")).toBeInTheDocument();
    expect(screen.getAllByText("Dalam Perbaikan").length).toBeGreaterThan(0);
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
    expect(screen.getByText(/Status saat ini/)).toBeInTheDocument();
    expect(
      screen.getByText(/membatalkan seluruh reservasi yang sudah disetujui/i),
    ).toBeInTheDocument();
  });

  it("mereset field filter saat nilai filter berubah (mis. tekan Reset)", () => {
    const { rerender } = render(
      <AdminFacilities
        items={items}
        meta={meta}
        locations={locations}
        filters={{ search: "lab", type: "aula", location: "Gedung A Lt.1", status: "ACTIVE" }}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Tipe" })).toHaveValue("Aula");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("Aktif");

    // Navigasi lunak ke /admin/fasilitas tanpa query merender komponen yang sama;
    // key membuat state filter diinisialisasi ulang.
    rerender(<AdminFacilities items={items} meta={meta} locations={locations} filters={{}} />);

    expect(screen.getByRole("combobox", { name: "Tipe" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveValue("");
    expect(screen.getByRole("combobox", { name: "Lokasi" })).toHaveValue("");
    expect(screen.getByRole("searchbox", { name: "Kata kunci" })).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Hapus pilihan tipe" })).not.toBeInTheDocument();
  });

  it("menolak isian tidak valid di klien tanpa memanggil API", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    renderFixture();

    await user.click(screen.getByRole("button", { name: /Tambah fasilitas/ }));
    const sheet = within(await screen.findByRole("dialog"));
    await user.clear(sheet.getByLabelText("Nama"));
    await user.clear(sheet.getByLabelText("Lokasi"));
    await user.clear(sheet.getByLabelText("Kapasitas"));
    await user.click(sheet.getByRole("button", { name: "Simpan" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(await screen.findByText("nama wajib diisi")).toBeInTheDocument();
    expect(screen.getByText("lokasi wajib diisi")).toBeInTheDocument();
    expect(screen.getByText("kapasitas harus minimal 1")).toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("menyediakan input unggah foto pada sheet tambah", async () => {
    const user = userEvent.setup();
    renderFixture();

    await user.click(screen.getByRole("button", { name: /Tambah fasilitas/ }));
    const sheet = within(await screen.findByRole("dialog"));

    const input = sheet.getByLabelText("Foto (opsional)");
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
  });

  it("menampilkan pratinjau dan opsi hapus foto saat mengubah fasilitas berfoto", async () => {
    const user = userEvent.setup();
    renderFixture([{ ...items[0], fotoUrl: "/api/facilities/1/photo" }]);

    await user.click(screen.getAllByRole("button", { name: /Ubah/ })[0]);
    const sheet = within(await screen.findByRole("dialog"));

    expect(sheet.getByAltText("Pratinjau foto fasilitas")).toHaveAttribute("src", "/api/facilities/1/photo");
    expect(sheet.getByRole("checkbox", { name: /Hapus foto saat ini/ })).toBeInTheDocument();
  });

  it("mengunggah foto lalu menyertakan pathname pada create", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url) === "/api/admin/facilities/photo-uploads" && init?.method === "POST") {
        return { ok: true, json: async () => ({ pathname: "facilities/7/x.png", uploadUrl: "https://blob.test/put" }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => "blob:preview") as never;
    URL.revokeObjectURL = vi.fn() as never;

    renderFixture();
    await user.click(screen.getByRole("button", { name: /Tambah fasilitas/ }));
    const sheet = within(await screen.findByRole("dialog"));
    await user.type(sheet.getByLabelText("Nama"), "Studio Musik");
    await user.type(sheet.getByLabelText("Lokasi"), "Gedung C");
    await user.upload(sheet.getByLabelText("Foto (opsional)"), new File(["x"], "foto.png", { type: "image/png" }));
    await user.click(sheet.getByRole("button", { name: "Simpan" }));

    await waitFor(() => {
      const createCall = fetchMock.mock.calls.find(([url]) => String(url) === "/api/admin/facilities");
      expect(createCall).toBeTruthy();
    });
    const createCall = fetchMock.mock.calls.find(([url]) => String(url) === "/api/admin/facilities")!;
    const body = JSON.parse(String(createCall[1]?.body));
    expect(body.fotoPathname).toBe("facilities/7/x.png");
    expect(body.fotoType).toBe("image/png");
    expect(fetchMock).toHaveBeenCalledWith("https://blob.test/put", expect.objectContaining({ method: "PUT" }));

    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    vi.unstubAllGlobals();
  });

  it("menghapus fasilitas setelah konfirmasi", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({}) }));
    vi.stubGlobal("fetch", fetchMock);
    renderFixture();

    await user.click(screen.getAllByRole("button", { name: /Hapus/ })[0]);
    const sheet = within(await screen.findByRole("dialog"));
    await user.click(sheet.getByRole("button", { name: "Hapus" }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/admin/facilities/1", { method: "DELETE" }),
    );
    vi.unstubAllGlobals();
  });

  it("menampilkan saran nonaktifkan saat fasilitas beriwayat", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn(async () => ({
      ok: false,
      json: async () => ({ detail: "Fasilitas memiliki riwayat sehingga tidak dapat dihapus permanen." }),
    }));
    vi.stubGlobal("fetch", fetchMock);
    renderFixture();

    await user.click(screen.getAllByRole("button", { name: /Hapus/ })[0]);
    const sheet = within(await screen.findByRole("dialog"));
    await user.click(sheet.getByRole("button", { name: "Hapus" }));

    expect(await screen.findByText(/memiliki riwayat/i)).toBeInTheDocument();
    vi.unstubAllGlobals();
  });
});
