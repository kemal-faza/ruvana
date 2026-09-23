import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const ALASAN_KEDALUWARSA = "Reservasi kedaluwarsa sebelum diproses.";

export type ExpiryClient = Prisma.TransactionClient | typeof prisma;

export function expirePendingReservations(client: ExpiryClient = prisma, now: Date = new Date()) {
  return client.reservation.updateMany({
    where: { status: "PENDING", startTime: { lte: now } },
    data: { status: "EXPIRED", alasan: ALASAN_KEDALUWARSA, waktuDiproses: now },
  });
}
