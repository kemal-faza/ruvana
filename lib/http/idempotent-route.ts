import type { Prisma } from "@/generated/prisma/client"
import { NextResponse } from "next/server"

import { RETENSI_IDEMPOTENCY_JAM } from "@/config/business"
import {
  claimOrGetIdempotencyKey,
  deleteIdempotencyClaim,
  isIdempotencySettled,
  storeIdempotencyResult,
  waitForIdempotencyResult,
} from "@/lib/db/idempotency"
import { isValidIdempotencyKey } from "@/lib/http/idempotency"
import { badRequest, idempotencyConflict, internalError } from "@/lib/http/problem"

export function readIdempotencyKey(request: Request, instance: string): string | NextResponse {
  const rawKey = request.headers.get("Idempotency-Key")
  if (!isValidIdempotencyKey(rawKey)) {
    return badRequest(instance, "Header Idempotency-Key wajib berupa UUID yang valid")
  }
  return rawKey!.trim()
}

interface IdempotentRouteOptions {
  key: string
  principalId: number
  scope: string
  requestHash: string
  instance: string
  conflictResponse?: (kind: "different" | "pending") => NextResponse
  mismatchedWaitAsPending?: boolean
}

export async function claimIdempotentRoute(options: IdempotentRouteOptions) {
  const { instance, requestHash, conflictResponse, mismatchedWaitAsPending, ...keyIdentity } = options
  const conflict = (kind: "different" | "pending") => conflictResponse?.(kind) ?? idempotencyConflict(
    instance,
    kind === "pending" ? "Permintaan dengan key yang sama sedang diproses, silakan ulangi." : undefined,
  )
  const identity = {
    ...keyIdentity,
    requestHash,
    expiresAt: new Date(Date.now() + RETENSI_IDEMPOTENCY_JAM * 60 * 60 * 1000),
  }

  try {
    const claim = await claimOrGetIdempotencyKey(identity)
    if (!claim.claimed) {
      if (claim.record.requestHash !== requestHash) return conflict("different")
      if (isIdempotencySettled(claim.record)) {
        return NextResponse.json(claim.record.responseBody as object, {
          status: claim.record.responseStatus ?? 500,
          headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
        })
      }
      const settled = await waitForIdempotencyResult(keyIdentity)
      if (!settled) {
        return conflict("pending")
      }
      if (settled.requestHash !== requestHash) return conflict(mismatchedWaitAsPending ? "pending" : "different")
      return NextResponse.json(settled.responseBody as object, {
        status: settled.responseStatus ?? 500,
        headers: { "Cache-Control": "no-store", "Content-Type": "application/json" },
      })
    }
  } catch (error) {
    console.error("Gagal klaim idempotency", error)
    return internalError(instance)
  }

  return {
    async settle(response: NextResponse) {
      try {
        const body = await response.clone().json()
        await storeIdempotencyResult(identity, { responseStatus: response.status, responseBody: body })
      } catch {
        // Penyimpanan replay best-effort; respons deterministik tetap dikembalikan.
      }
      return response
    },
    async commit(tx: Prisma.TransactionClient, status: number, body: unknown) {
      const stored = await storeIdempotencyResult(identity, { responseStatus: status, responseBody: body }, tx)
      if (stored.count !== 1) throw new Error("Klaim idempotency tidak dapat diselesaikan")
    },
    async fail() {
      try {
        await deleteIdempotencyClaim(identity)
      } catch {}
      return internalError(instance)
    },
  }
}
