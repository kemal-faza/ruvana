import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { internalError, unauthorized } from "@/lib/http/problem";
import { expirePendingReservations } from "@/lib/reservations/expiry";

// Pemicu terjadwal TASK 3.6 (Vercel Cron → GET di sini). Sengaja tanpa guard
// sesi, tanpa validasi Origin, dan tanpa Idempotency-Key: pemanggilnya bukan
// browser melainkan scheduler server-ke-server yang membawa bearer secret,
// dan operasinya idempoten sehingga aman di-retry/dieksekusi berulang.
export async function GET(request: NextRequest) {
  const instance = new URL(request.url).pathname;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("CRON_SECRET belum dikonfigurasi");
    return internalError(instance);
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${cronSecret}`) {
    return unauthorized(instance, "Kredensial cron tidak valid.");
  }

  try {
    const now = new Date();
    const result = await expirePendingReservations(undefined, now);
    return NextResponse.json(
      { expired: result.count, processedAt: now.toISOString() },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    console.error("Gagal menjalankan expiry reservasi terjadwal", e);
    return internalError(instance);
  }
}
