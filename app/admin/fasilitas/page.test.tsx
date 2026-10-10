import { beforeEach, describe, expect, it, vi } from "vitest"

const { listAdminFacilities, listAdminLocations, listArchivedFacilities, redirect } = vi.hoisted(() => ({
  listAdminFacilities: vi.fn(),
  listAdminLocations: vi.fn(),
  listArchivedFacilities: vi.fn(),
  redirect: vi.fn(() => {
    throw new Error("redirect")
  }),
}))

vi.mock("next/navigation", () => ({ redirect }))
vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn(async () => ({ id: 1, role: "admin" })) }))
vi.mock("@/lib/services/admin-facility-service", () => ({ listAdminFacilities, listAdminLocations, listArchivedFacilities }))
vi.mock("@/components/admin/AdminFacilities", () => ({ default: () => null }))

import AdminFasilitasPage from "./page"

describe("halaman kelola fasilitas", () => {
  beforeEach(() => {
    listAdminFacilities.mockReset()
    listAdminLocations.mockReset()
    listArchivedFacilities.mockReset()
    redirect.mockClear()
    listAdminLocations.mockResolvedValue([])
    listArchivedFacilities.mockResolvedValue([])
    listAdminFacilities.mockResolvedValue({
      items: [],
      meta: { page: 2, perPage: 20, totalItems: 60, totalPages: 3 },
    })
  })

  it("meneruskan filter dan pagination ke komponen", async () => {
    const page = await AdminFasilitasPage({ searchParams: Promise.resolve({ search: "lab", page: "2" }) })

    expect(listAdminFacilities).toHaveBeenCalledWith({ page: 2, perPage: 20, search: "lab" })
    expect(page.props.filters).toEqual({
      search: "lab",
      type: undefined,
      location: undefined,
      status: undefined,
      perPage: 20,
    })
  })

  it("mengarahkan halaman di luar rentang ke halaman terakhir yang valid", async () => {
    await expect(
      AdminFasilitasPage({ searchParams: Promise.resolve({ search: "lab", status: "ACTIVE", page: "9" }) }),
    ).rejects.toThrow("redirect")

    expect(redirect).toHaveBeenCalledExactlyOnceWith("/admin/fasilitas?search=lab&status=ACTIVE&page=3")
  })
})
