import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { axe } from "vitest-axe"

import { ReservationQueue } from "@/components/staff/reservation-queue"
import type { StaffReservationResult } from "@/lib/services/reservation-service"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const item = {
  id: 92,
  facility: { id: 3, nama: "Aula Utama", tipe: "ruang_kelas", lokasi: "Gedung Serbaguna" },
  date: "2026-12-03",
  timezone: "Asia/Jakarta",
  startTime: "09:00",
  endTime: "10:00",
  startsAt: "2026-12-03T02:00:00.000Z",
  endsAt: "2026-12-03T03:00:00.000Z",
  tujuanPenggunaan: "Diskusi kelompok",
  status: "PENDING",
  alasan: null,
  submittedAt: "2026-12-01T02:00:00.000Z",
  processedAt: null,
  processedBy: null,
  pemohon: { id: 5, nama: "Siti Aminah", email: "siti@example.com" },
} as unknown as StaffReservationResult

function mockFetch() {
  const fetchMock = vi.fn(async (url: unknown) => {
    if (String(url).includes("/approve") || String(url).includes("/reject")) {
      return { ok: true, status: 200, json: async () => ({}) } as Response
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ items: [item], meta: { page: 1, perPage: 10, totalItems: 1, totalPages: 1 } }),
    } as Response
  })
  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

describe("ReservationQueue", () => {
  it("menjelaskan urutan tanpa istilah teknis FIFO", async () => {
    mockFetch()
    const { container } = render(<ReservationQueue />)

    await screen.findByText("Aula Utama · 3 Des 2026 · 09:00–10:00")
    expect((container.textContent ?? "")).not.toMatch(/FIFO/)
  })

  it("menyediakan fasilitas, pemohon, tanggal/waktu, dan tujuan untuk mengambil keputusan (RES-05)", async () => {
    mockFetch()
    render(<ReservationQueue />)

    const judul = await screen.findByText(/Aula Utama · 3 Des 2026 · 09:00–10:00/)
    expect(judul).toHaveTextContent("Aula Utama")
    expect(judul).toHaveTextContent("3 Des 2026")
    expect(judul).toHaveTextContent("09:00–10:00")

    const deskripsi = screen.getByText(/Siti Aminah/)
    expect(deskripsi).toHaveTextContent("Siti Aminah (siti@example.com)")
    expect(deskripsi).toHaveTextContent("Diskusi kelompok")
  })

  it("memberi tahu hasil persetujuan tanpa id teknis", async () => {
    const user = userEvent.setup()
    mockFetch()
    render(<ReservationQueue />)

    await screen.findByText("Aula Utama · 3 Des 2026 · 09:00–10:00")
    await user.click(screen.getByRole("button", { name: "Setujui" }))

    const notice = await screen.findByRole("status").catch(() => screen.findByText(/telah disetujui/))
    expect(notice).toHaveTextContent("Aula Utama")
    expect(notice).toHaveTextContent(/telah disetujui/)
    expect(notice.textContent ?? "").not.toMatch(/#92/)
  })

  it("memakai frasa Kesalahan jaringan berbahasa Indonesia", async () => {
    const user = userEvent.setup()
    vi.stubGlobal("fetch", vi.fn(async (url: unknown) => {
      if (String(url).includes("/approve")) throw new Error("putus")
      return {
        ok: true,
        status: 200,
        json: async () => ({ items: [item], meta: { page: 1, perPage: 10, totalItems: 1, totalPages: 1 } }),
      } as Response
    }))
    render(<ReservationQueue />)

    await screen.findByText("Aula Utama · 3 Des 2026 · 09:00–10:00")
    await user.click(screen.getByRole("button", { name: "Setujui" }))

    expect(await screen.findByText(/Kesalahan jaringan/)).toBeInTheDocument()
  })

  it("lolos pemeriksaan aksesibilitas", async () => {
    mockFetch()
    const { container } = render(<ReservationQueue />)

    await screen.findByText("Aula Utama · 3 Des 2026 · 09:00–10:00")
    expect((await axe(container)).violations).toEqual([])
  })
})


describe("ReservationQueue hierarki tombol", () => {
  it("Setujui primary, Tolak danger, dan keduanya memenuhi target sentuh", async () => {
    mockFetch()
    render(<ReservationQueue />)

    await screen.findByText("Aula Utama · 3 Des 2026 · 09:00–10:00")
    const setujui = screen.getByRole("button", { name: "Setujui" })
    const tolak = screen.getByRole("button", { name: "Tolak" })
    expect(setujui).toHaveClass("bg-primary")
    expect(setujui).toHaveClass("min-h-11")
    expect(tolak).toHaveClass("bg-destructive-subdued")
    expect(tolak).toHaveClass("min-h-11")
  })

  it("tombol paginasi dan dialog memenuhi target sentuh minimal", async () => {
    const user = userEvent.setup()
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        if (String(url).includes("/approve") || String(url).includes("/reject")) {
          return { ok: true, status: 200, json: async () => ({}) } as Response
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ items: [item], meta: { page: 1, perPage: 10, totalItems: 11, totalPages: 2 } }),
        } as Response
      }),
    )
    if (typeof HTMLDialogElement.prototype.showModal !== "function") {
      Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
        value: vi.fn(),
        configurable: true,
        writable: true,
      })
    } else {
      vi.spyOn(HTMLDialogElement.prototype, "showModal").mockImplementation(() => undefined)
    }
    render(<ReservationQueue />)

    await screen.findByText("Aula Utama · 3 Des 2026 · 09:00–10:00")
    for (const nama of ["Sebelumnya", "Berikutnya"]) {
      expect(screen.getByRole("button", { name: nama })).toHaveClass("min-h-11")
    }
    await user.click(screen.getByRole("button", { name: "Tolak" }))
    document.querySelector("dialog")?.setAttribute("open", "")
    expect(screen.getByRole("button", { name: "Tolak reservasi" })).toHaveClass("min-h-11")
    expect(screen.getByRole("button", { name: "Batal" })).toHaveClass("min-h-11")
  })
})

describe("ReservationQueue loading", () => {
  it("menampilkan skeleton dan status sebelum antrean tiba", async () => {
    let rilisRespons: ((value: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((resolve) => { rilisRespons = resolve; })),
    );

    render(<ReservationQueue />);

    expect(await screen.findByRole("status")).toHaveTextContent("Memuat antrean");
    expect(screen.queryByText("Memuat antrean…")).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Setujui" })).not.toBeInTheDocument();

    rilisRespons?.(new Response(JSON.stringify({
      items: [],
      meta: { page: 1, perPage: 10, totalItems: 0, totalPages: 0 },
    }), { status: 200 }));

    expect(await screen.findByText("Belum ada reservasi yang menunggu.")).toBeInTheDocument();
  });
});

const itemLain = {
  ...item,
  id: 93,
  facility: { ...item.facility, id: 4, nama: "Ruang Rapat" },
} as unknown as StaffReservationResult;

function queueResponse(items: unknown[]): Response {
  return new Response(JSON.stringify({
    items,
    meta: { page: 1, perPage: 10, totalItems: items.length, totalPages: items.length > 0 ? 1 : 0 },
  }), { status: 200 });
}

function problemResponse(code: string, detail: string, status: number): Response {
  return new Response(JSON.stringify({ code, detail }), {
    status,
    headers: { "Content-Type": "application/problem+json" },
  });
}

function stubDialogMethods() {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    value: function buka(this: HTMLDialogElement) { this.setAttribute("open", ""); },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    value: function tutup(this: HTMLDialogElement) { this.removeAttribute("open"); },
    configurable: true,
    writable: true,
  });
}

describe("ReservationQueue proses dan konflik (RES-06)", () => {
  it("menampilkan Memproses… pada tombol Setujui yang sedang diproses", async () => {
    const user = userEvent.setup();
    let rilisApprove: ((value: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: unknown) => {
        if (String(url).includes("/approve")) {
          return new Promise<Response>((resolve) => { rilisApprove = resolve; });
        }
        return Promise.resolve(queueResponse([item]));
      }),
    );

    render(<ReservationQueue />);
    await screen.findByText("Aula Utama · 3 Des 2026 · 09:00–10:00");
    await user.click(screen.getByRole("button", { name: "Setujui" }));

    const tombolProses = await screen.findByRole("button", { name: "Memproses…" });
    expect(tombolProses).toBeDisabled();

    rilisApprove?.(problemResponse("APPROVAL_CONFLICT", "Bentrok.", 409));
    await screen.findByRole("alert");
  });

  it("konflik 409 tidak memicu refetch dan daftar tidak diganti skeleton", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        const alamat = String(url);
        calls.push(alamat);
        if (alamat.includes("/approve")) {
          return problemResponse("APPROVAL_CONFLICT", "Slot reservasi telah disetujui untuk reservasi lain.", 409);
        }
        return queueResponse([item]);
      }),
    );

    render(<ReservationQueue />);
    await screen.findByText("Aula Utama · 3 Des 2026 · 09:00–10:00");
    await user.click(screen.getByRole("button", { name: "Setujui" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Slot reservasi telah disetujui untuk reservasi lain.");
    await waitFor(() => expect(alert).toHaveFocus());

    expect(calls.filter((alamat) => alamat.includes("/api/staff/reservations?")).length).toBe(1);
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBe(0);
    expect(screen.getByText("Aula Utama · 3 Des 2026 · 09:00–10:00")).toBeInTheDocument();
  });

  it("menampilkan pesan gagal di kartu item yang diklik", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        if (String(url).includes("/approve")) {
          return problemResponse("APPROVAL_CONFLICT", "Bentrok dengan reservasi lain.", 409);
        }
        return queueResponse([item, itemLain]);
      }),
    );

    render(<ReservationQueue />);
    await screen.findByText("Ruang Rapat · 3 Des 2026 · 09:00–10:00");
    await user.click(screen.getAllByRole("button", { name: "Setujui" })[1]);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Bentrok dengan reservasi lain.");

    const kartu = alert.closest('[data-slot="card"]');
    expect(kartu).not.toBeNull();
    expect(kartu).toHaveTextContent("Ruang Rapat");
    expect(kartu).not.toHaveTextContent("Aula Utama");
    expect(within(kartu as HTMLElement).getByRole("alert")).toBe(alert);
  });

  it("kegagalan karena item sudah tidak PENDING memicu refetch", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        const alamat = String(url);
        calls.push(alamat);
        if (alamat.includes("/approve")) {
          return problemResponse("INVALID_RESERVATION_TRANSITION", "Reservasi tidak berada pada status yang dapat disetujui.", 409);
        }
        const jumlahMuat = calls.filter((a) => a.includes("/api/staff/reservations?")).length;
        return jumlahMuat <= 1 ? queueResponse([item]) : queueResponse([]);
      }),
    );

    render(<ReservationQueue />);
    await screen.findByText("Aula Utama · 3 Des 2026 · 09:00–10:00");
    await user.click(screen.getByRole("button", { name: "Setujui" }));

    await waitFor(() =>
      expect(calls.filter((alamat) => alamat.includes("/api/staff/reservations?")).length).toBe(2),
    );
  });

  it("modal tolak tetap terbuka saat validasi gagal", async () => {
    const user = userEvent.setup();
    stubDialogMethods();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        if (String(url).includes("/reject")) {
          return problemResponse("VALIDATION_FAILED", "Alasan wajib diisi.", 422);
        }
        return queueResponse([item]);
      }),
    );

    render(<ReservationQueue />);
    await screen.findByText("Aula Utama · 3 Des 2026 · 09:00–10:00");
    await user.click(screen.getByRole("button", { name: "Tolak" }));

    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    dialog.setAttribute("open", "");
    await user.type(screen.getByLabelText("Alasan penolakan"), "Kapasitas penuh");
    await user.click(screen.getByRole("button", { name: "Tolak reservasi" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Alasan wajib diisi.");
    expect(dialog).toHaveAttribute("open");
    expect(dialog.contains(alert)).toBe(true);
  });

  it("modal tolak ditutup dan antrean dimuat ulang saat item sudah tidak PENDING", async () => {
    const user = userEvent.setup();
    stubDialogMethods();
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: unknown) => {
        const alamat = String(url);
        calls.push(alamat);
        if (alamat.includes("/reject")) {
          return problemResponse("INVALID_RESERVATION_TRANSITION", "Reservasi tidak berada pada status yang dapat ditolak.", 409);
        }
        const jumlahMuat = calls.filter((a) => a.includes("/api/staff/reservations?")).length;
        return jumlahMuat <= 1 ? queueResponse([item]) : queueResponse([]);
      }),
    );

    render(<ReservationQueue />);
    await screen.findByText("Aula Utama · 3 Des 2026 · 09:00–10:00");
    await user.click(screen.getByRole("button", { name: "Tolak" }));

    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    dialog.setAttribute("open", "");
    await user.type(screen.getByLabelText("Alasan penolakan"), "Kapasitas penuh");
    await user.click(screen.getByRole("button", { name: "Tolak reservasi" }));

    await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
    await waitFor(() =>
      expect(calls.filter((alamat) => alamat.includes("/api/staff/reservations?")).length).toBe(2),
    );
  });
});
