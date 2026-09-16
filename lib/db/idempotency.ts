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
