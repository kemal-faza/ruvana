import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getSessionUser } from "@/lib/auth"
import { consumeReportUploadRateLimit } from "@/lib/db/report-upload-rate-limit"
import { POST } from "./route"

vi.mock("@/lib/auth", () => ({ getSessionUser: vi.fn() }))
vi.mock("@/lib/db/report-upload-rate-limit", () => ({ consumeReportUploadRateLimit: vi.fn() }))
vi.mock("@/lib/db/reports", () => ({ findReportByFoto: vi.fn() }))
vi.mock("@/lib/storage/report-photo", () => ({
  createReportPhotoUpload: vi.fn(),
  isOwnedReportPhotoPathname: vi.fn(),
  isReportPhotoContentType: vi.fn(() => true),
  removeReportPhoto: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv("ALLOWED_ORIGINS", "http://localhost:3000")
  vi.mocked(getSessionUser).mockResolvedValue({ id: 7, role: "pengguna" } as never)
  vi.mocked(consumeReportUploadRateLimit).mockResolvedValue(false)
})

describe("POST /api/reports/photo-uploads", () => {
  it("mengirim respons masalah 429 sesuai kontrak tanpa Retry-After", async () => {
    const request = new NextRequest("http://localhost:3000/api/reports/photo-uploads", {
      method: "POST",
      headers: { Origin: "http://localhost:3000", "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: "image/jpeg", size: 1024 }),
    })

    const response = await POST(request)

    expect(consumeReportUploadRateLimit).toHaveBeenCalledOnce()
    expect(response.status).toBe(429)
    expect(response.headers.get("Content-Type")).toBe("application/problem+json")
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(response.headers.has("Retry-After")).toBe(false)
    expect(await response.json()).toEqual({
      type: "https://ruvana.invalid/problems/upload-rate-limited",
      title: "Batas unggah tercapai",
      status: 429,
      detail: "Batas penerbitan URL unggah per jam tercapai. Coba lagi nanti.",
      instance: "/api/reports/photo-uploads",
      code: "UPLOAD_RATE_LIMITED",
    })
  })
})
