import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"

import {
  claimOrGetIdempotencyKey,
  deleteIdempotencyClaim,
  storeIdempotencyResult,
  waitForIdempotencyResult,
} from "@/lib/db/idempotency"
import { claimIdempotentRoute, readIdempotencyKey } from "@/lib/http/idempotent-route"
import { idempotencyConflict, notFound, validationFailed } from "@/lib/http/problem"

vi.mock("@/lib/db/idempotency", () => ({
  claimOrGetIdempotencyKey: vi.fn(),
  deleteIdempotencyClaim: vi.fn(),
  isIdempotencySettled: vi.fn((record) => record.responseStatus !== null && record.responseBody !== null),
  storeIdempotencyResult: vi.fn(),
  waitForIdempotencyResult: vi.fn(),
}))

const key = "11111111-1111-4111-8111-111111111111"
const options = { key, principalId: 7, scope: "POST:/api/contoh", requestHash: "hash-a", instance: "/api/contoh" }

function record(overrides: Record<string, unknown> = {}) {
  return { requestHash: "hash-a", responseStatus: null, responseBody: null, ...overrides }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({ claimed: true, record: record() } as never)
  vi.mocked(storeIdempotencyResult).mockResolvedValue({ count: 1 } as never)
  vi.mocked(waitForIdempotencyResult).mockResolvedValue(null)
})

describe("route idempotensi bersama", () => {
  it("menolak key yang tidak valid sebelum klaim", () => {
    const response = readIdempotencyKey(new Request("http://localhost/api/contoh"), options.instance)
    expect(response).toBeInstanceOf(NextResponse)
    expect((response as NextResponse).status).toBe(400)
    expect(claimOrGetIdempotencyKey).not.toHaveBeenCalled()
  })

  it("mengklaim key valid dengan masa berlaku", async () => {
    const value = readIdempotencyKey(new Request("http://localhost/api/contoh", { headers: { "Idempotency-Key": key } }), options.instance)
    expect(value).toBe(key)
    const context = await claimIdempotentRoute(options)
    expect(context).not.toBeInstanceOf(NextResponse)
    expect(claimOrGetIdempotencyKey).toHaveBeenCalledWith(expect.objectContaining({
      key, principalId: 7, scope: options.scope, requestHash: "hash-a", expiresAt: expect.any(Date),
    }))
  })

  it("menolak payload berbeda dan me-replay hasil tersimpan", async () => {
    vi.mocked(claimOrGetIdempotencyKey).mockResolvedValueOnce({ claimed: false, record: record({ requestHash: "hash-b" }) } as never)
    const conflict = await claimIdempotentRoute(options)
    expect(conflict).toBeInstanceOf(NextResponse)
    expect((conflict as NextResponse).status).toBe(409)
    expect((await (conflict as NextResponse).json()).code).toBe("IDEMPOTENCY_KEY_REUSED")

    vi.mocked(claimOrGetIdempotencyKey).mockResolvedValueOnce({ claimed: false, record: record({ responseStatus: 422, responseBody: { code: "VALIDATION_FAILED" } }) } as never)
    const replay = await claimIdempotentRoute(options)
    expect((replay as NextResponse).status).toBe(422)
    expect(await (replay as NextResponse).json()).toEqual({ code: "VALIDATION_FAILED" })
  })

  it("menunggu hasil klaim serentak dan menolak yang masih diproses", async () => {
    vi.mocked(claimOrGetIdempotencyKey).mockResolvedValue({ claimed: false, record: record() } as never)
    vi.mocked(waitForIdempotencyResult).mockResolvedValueOnce(record({ responseStatus: 200, responseBody: { ok: true } }) as never)
    const replay = await claimIdempotentRoute(options)
    expect((replay as NextResponse).status).toBe(200)
    expect(await (replay as NextResponse).json()).toEqual({ ok: true })

    const pending = await claimIdempotentRoute(options)
    expect((pending as NextResponse).status).toBe(409)
    expect((await (pending as NextResponse).json()).code).toBe("IDEMPOTENCY_KEY_REUSED")
  })

  it("menyimpan 422, 404, dan 409 deterministik untuk replay", async () => {
    const context = await claimIdempotentRoute(options)
    if (context instanceof NextResponse) throw new Error("Klaim gagal")
    const invalid = await context.settle(validationFailed(options.instance, [{ field: "nama", code: "REQUIRED", message: "Wajib" }]))
    const missing = await context.settle(notFound(options.instance, "Tidak ada"))
    const conflict = await context.settle(idempotencyConflict(options.instance))
    expect(invalid.status).toBe(422)
    expect(missing.status).toBe(404)
    expect(conflict.status).toBe(409)
    expect(storeIdempotencyResult).toHaveBeenCalledWith(expect.objectContaining({ key }), expect.objectContaining({ responseStatus: 422 }))
    expect(storeIdempotencyResult).toHaveBeenCalledWith(expect.objectContaining({ key }), expect.objectContaining({ responseStatus: 404 }))
    expect(storeIdempotencyResult).toHaveBeenCalledWith(expect.objectContaining({ key }), expect.objectContaining({ responseStatus: 409 }))
  })

  it("menggagalkan transaksi ketika penyimpanan hasil tidak menemukan klaim", async () => {
    const context = await claimIdempotentRoute(options)
    if (context instanceof NextResponse) throw new Error("Klaim gagal")
    vi.mocked(storeIdempotencyResult).mockResolvedValueOnce({ count: 0 } as never)
    await expect(context.commit({} as never, 200, { ok: true })).rejects.toThrow("Klaim idempotency tidak dapat diselesaikan")
  })

  it("menghapus klaim saat 5xx agar retry dapat diproses", async () => {
    const context = await claimIdempotentRoute(options)
    if (context instanceof NextResponse) throw new Error("Klaim gagal")
    const response = await context.fail()
    expect(response.status).toBe(500)
    expect(deleteIdempotencyClaim).toHaveBeenCalledWith(expect.objectContaining({ key }))
  })

  it("mengembalikan 500 saat klaim gagal", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(claimOrGetIdempotencyKey).mockRejectedValueOnce(new Error("database mati"))
    const response = await claimIdempotentRoute(options)
    expect((response as NextResponse).status).toBe(500)
    errorLog.mockRestore()
  })
})
