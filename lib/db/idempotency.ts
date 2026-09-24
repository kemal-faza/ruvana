import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export interface FindIdempotencyParams {
  key: string;
  principalId: number;
  scope: string;
}

export function findIdempotencyRecord({ key, principalId, scope }: FindIdempotencyParams) {
  return prisma.idempotencyKey.findFirst({
    where: { key, principalId, scope },
  });
}

export function findIdempotencyRecordTx(
  tx: Prisma.TransactionClient,
  { key, principalId, scope }: FindIdempotencyParams,
) {
  return tx.idempotencyKey.findFirst({
    where: { key, principalId, scope },
  });
}

export function createIdempotencyRecord(
  tx: Prisma.TransactionClient,
  data: {
    key: string;
    principalId: number;
    scope: string;
    requestHash: string;
    responseStatus: number;
    responseBody: unknown;
    expiresAt: Date;
  },
) {
  return tx.idempotencyKey.create({
    data: {
      key: data.key,
      principalId: data.principalId,
      scope: data.scope,
      requestHash: data.requestHash,
      responseStatus: data.responseStatus,
      responseBody: data.responseBody as Prisma.InputJsonValue,
      expiresAt: data.expiresAt,
    },
  });
}

export function deleteExpiredIdempotencyKeys() {
  return prisma.idempotencyKey.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
}

function isUniqueViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: unknown }).code === "P2002";
}

export interface ClaimIdempotencyParams extends FindIdempotencyParams {
  requestHash: string;
  expiresAt: Date;
}

export type ClaimOrGetResult =
  | { claimed: true; record: Awaited<ReturnType<typeof prisma.idempotencyKey.create>> }
  | { claimed: false; record: NonNullable<Awaited<ReturnType<typeof findIdempotencyRecord>>> };

/**
 * Klaim key idempotency SEBELUM operasi bisnis berjalan.
 *
 * Dua request bersamaan dengan key yang sama: hanya satu yang berhasil
 * INSERT (pemilik klaim) dan melanjutkan ke operasi bisnis; yang lain
 * mendapat record pemenang lewat pelanggaran unique, lalu me-replay
 * hasilnya. Ini menutup race lookup-then-create yang sebelumnya bisa
 * membuat dua reservasi sebelum record idempotency disimpan.
 */
export async function claimOrGetIdempotencyKey({
  key,
  principalId,
  scope,
  requestHash,
  expiresAt,
}: ClaimIdempotencyParams): Promise<ClaimOrGetResult> {
  try {
    const record = await prisma.idempotencyKey.create({
      data: { key, principalId, scope, requestHash, expiresAt },
    });
    return { claimed: true, record };
  } catch (e) {
    if (!isUniqueViolation(e)) throw e;
    const record = await prisma.idempotencyKey.findFirst({
      where: { key, principalId, scope },
    });
    if (!record) {
      // Klaim pemenang terhapus bersamaan (mis. cleanup 5xx); coba klaim ulang sekali.
      const retry = await prisma.idempotencyKey.create({
        data: { key, principalId, scope, requestHash, expiresAt },
      });
      return { claimed: true, record: retry };
    }
    return { claimed: false, record };
  }
}

export function isIdempotencySettled(
  record: Pick<ClaimOrGetResult["record"], "responseStatus" | "responseBody">,
): boolean {
  return record.responseStatus !== null && record.responseBody !== null;
}

/**
 * Menunggu pemilik klaim menyimpan hasil (OpenAPI: key/payload sama menunggu
 * dan mengembalikan hasil pertama). Polling singkat agar duplikat bersamaan
 * me-replay respons yang sama, bukan membuat operasi kedua.
 */
export async function waitForIdempotencyResult(
  { key, principalId, scope }: FindIdempotencyParams,
  opts: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<NonNullable<Awaited<ReturnType<typeof findIdempotencyRecord>>> | null> {
  const timeoutMs = opts.timeoutMs ?? 8000;
  const intervalMs = opts.intervalMs ?? 200;
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const record = await prisma.idempotencyKey.findFirst({
      where: { key, principalId, scope },
    });
    if (record && isIdempotencySettled(record)) return record;
    if (Date.now() >= deadline) return record && isIdempotencySettled(record) ? record : null;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

export function storeIdempotencyResult(
  { key, principalId, scope, requestHash }: ClaimIdempotencyParams,
  result: { responseStatus: number; responseBody: unknown },
) {
  // updateMany dengan guard requestHash: hanya pemilik klaim yang menyimpan.
  return prisma.idempotencyKey.updateMany({
    where: { key, principalId, scope, requestHash },
    data: {
      responseStatus: result.responseStatus,
      responseBody: result.responseBody as Prisma.InputJsonValue,
    },
  });
}

/**
 * Hapus klaim tanpa hasil agar retry dengan key yang sama dapat diproses.
 * Dipakai saat operasi gagal 5xx (OpenAPI: 5xx tidak disimpan/di-replay).
 */
export function deleteIdempotencyClaim({ key, principalId, scope }: FindIdempotencyParams) {
  return prisma.idempotencyKey.deleteMany({
    where: { key, principalId, scope, responseStatus: null },
  });
}
