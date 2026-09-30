import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ApprovedReservationList } from "@/components/staff/approved-reservation-list"
import type { StaffReservationResult } from "@/lib/services/reservation-service"

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const item = {
  id: 93,
  facility: { id: 3, nama: "Aula Utama", tipe: "ruang_kelas", lokasi: "Gedung Serbaguna" },
  date: "2026-12-04",
  timezone: "Asia/Jakarta",
  startTime: "09:00",
  endTime: "10:00",
  startsAt: "2026-12-04T02:00:00.000Z",
  endsAt: "2026-12-04T03:00:00.000Z",
  tujuanPenggunaan: "Diskusi kelompok",
  status: "APPROVED",
  alasan: null,
  submittedAt: "2026-12-01T02:00:00.000Z",
  processedAt: "2026-12-01T03:00:00.000Z",
  processedBy: null,
  pemohon: { id: 5, nama: "Siti Aminah", email: "siti@example.com" },
} as unknown as StaffReservationResult

function mockFetch() {
  const fetchMock = vi.fn(async (url: unknown) => {
    if (String(url).includes("/cancel")) {
      return { ok: true, status: 200, json: async () => ({}) } as Response
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ items: [item], meta: { page: 1, perPage: 10, totalItems: 1, totalPages: 1 } }),
    } as Response
  })
  vi.stubGlobal("fetch", fetchMock)
  for (const metode of ["showModal", "close"] as const) {
    if (typeof HTMLDialogElement.prototype[metode] !== "function") {
      Object.defineProperty(HTMLDialogElement.prototype, metode, {
        value: vi.fn(),
        configurable: true,
        writable: true,
      })
    } else {
      vi.spyOn(HTMLDialogElement.prototype, metode).mockImplementation(() => undefined)
    }
  }
}

describe("ApprovedReservationList", () => {
  it("memberi tahu hasil pembatalan mendesak tanpa id teknis", async () => {
    const user = userEvent.setup()
    mockFetch()
    render(<ApprovedReservationList />)

    await screen.findByText("Aula Utama · 4 Des 2026 · 09:00–10:00")
    await user.click(screen.getByRole("button", { name: "Batalkan mendesak" }))
    document.querySelector("dialog")?.setAttribute("open", "")
    await user.type(screen.getByLabelText("Alasan pembatalan mendesak"), "Atap bocor")
    await user.click(screen.getByRole("button", { name: "Batalkan reservasi" }))

    const notice = await screen.findByText(/telah dibatalkan/)
    expect(notice).toHaveTextContent("Aula Utama")
    expect(notice.textContent ?? "").not.toMatch(/#93/)
  })
})


describe("ApprovedReservationList loading", () => {
  it("menampilkan skeleton dan status sebelum daftar tiba", async () => {
    let rilisRespons: ((value: Response) => void) | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => new Promise<Response>((resolve) => { rilisRespons = resolve; })),
    );

    render(<ApprovedReservationList />);

    expect(await screen.findByRole("status")).toHaveTextContent("Memuat reservasi disetujui");
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Batalkan mendesak" })).not.toBeInTheDocument();

    rilisRespons?.(new Response(JSON.stringify({
      items: [],
      meta: { page: 1, perPage: 10, totalItems: 0, totalPages: 0 },
    }), { status: 200 }));

    expect(await screen.findByText("Tidak ada reservasi disetujui")).toBeInTheDocument();
  });
});
