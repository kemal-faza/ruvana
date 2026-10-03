import type { Prisma } from "@/generated/prisma/client"

import { LAPORAN_UPLOAD } from "@/config/business"
import { prisma } from "@/lib/prisma"

function incrementBucket(tx: Prisma.TransactionClient, key: string, now: Date, cutoff: Date) {
  return tx.$queryRaw<Array<{ requestCount: number }>>`
    INSERT INTO "report_upload_rate_limits" AS bucket
      ("key", "windowStartedAt", "requestCount", "updatedAt")
    VALUES (${key}, ${now}, 1, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "requestCount" = CASE
        WHEN bucket."windowStartedAt" <= ${cutoff} THEN 1
        ELSE bucket."requestCount" + 1
      END,
      "windowStartedAt" = CASE
        WHEN bucket."windowStartedAt" <= ${cutoff} THEN ${now}
        ELSE bucket."windowStartedAt"
      END,
      "updatedAt" = ${now}
    RETURNING "requestCount"
  `
}

/** Dua bucket dikonsumsi dalam satu transaksi; ON CONFLICT menserialisasi hitungan lintas instance. */
export async function consumeReportUploadRateLimit(userId: number, ipHash: string): Promise<boolean> {
  const now = new Date()
  const cutoff = new Date(now.getTime() - LAPORAN_UPLOAD.jendelaRateLimitMs)

  const counts = await prisma.$transaction(async (tx) => {
    await tx.reportUploadRateLimit.deleteMany({ where: { updatedAt: { lt: cutoff } } })
    const userRows = await incrementBucket(tx, "user:" + userId, now, cutoff)
    const ipRows = await incrementBucket(tx, "ip:" + ipHash, now, cutoff)
    return { user: userRows[0]?.requestCount ?? 0, ip: ipRows[0]?.requestCount ?? 0 }
  })

  return (
    counts.user <= LAPORAN_UPLOAD.maksUnggahPerJamPengguna &&
    counts.ip <= LAPORAN_UPLOAD.maksUnggahPerJamIp
  )
}
