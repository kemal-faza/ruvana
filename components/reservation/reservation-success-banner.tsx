"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ReservationStatusBadge } from "@/components/reservation/reservation-status-badge";
import { BUTTON_ACTION_CLASS, Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Banner konfirmasi satu-kali setelah pengajuan berhasil. Hanya dirender
// halaman detail ketika query `?baru=1` ada (lihat RiwayatDetailPage), jadi
// pembukaan dari riwayat tidak pernah menampilkannya. Fokus dipindahkan ke
// banner saat tampil karena navigasi client tidak memindahkan fokus sendiri.
export function ReservationSuccessBanner() {
  const [tutup, setTutup] = useState(false);
  const router = useRouter();
  const bannerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    bannerRef.current?.focus();
  }, []);

  if (tutup) return null;

  function handleTutup() {
    setTutup(true);
    // Buang query penanda agar banner tidak muncul lagi saat halaman dimuat ulang.
    router.replace(window.location.pathname);
  }

  return (
    <section
      ref={bannerRef}
      role="status"
      tabIndex={-1}
      aria-labelledby="banner-pengajuan-judul"
      className="rounded-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="border-success-subdued bg-success-subdued">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <h2 id="banner-pengajuan-judul" className="text-lg font-medium">
                Reservasi berhasil diajukan
              </h2>
              <ReservationStatusBadge status="PENDING" />
            </div>
            <Button
              type="button"
              variant="ghost"
              className={BUTTON_ACTION_CLASS}
              onClick={handleTutup}
              aria-label="Tutup pemberitahuan"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-success-subdued-foreground">
            Pengajuan Anda tercatat. Petugas akan meninjau pengajuan Anda dan statusnya akan
            diperbarui di halaman ini.
          </p>
          <div>
            <Button
              type="button"
              variant="outline"
              className={BUTTON_ACTION_CLASS}
              render={<Link href="/reservasi/riwayat" />}
            >
              Lihat riwayat reservasi
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
