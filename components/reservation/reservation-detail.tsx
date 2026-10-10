"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, Wrench } from "lucide-react";

import { BATAS_ALASAN_MAX, BATAS_PEMBATALAN_JAM } from "@/config/business";
import { tampilanDetailReservasi } from "@/lib/reservations/reservation-display";
import { ReservationStatusBadge } from "@/components/reservation/reservation-status-badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReservationResult } from "@/lib/services/reservation-service";

export function ReservationDetail({ id }: { id: number }) {
  const [data, setData] = useState<ReturnType<typeof tampilanDetailReservasi> | null>(null);
  const [loading, setLoading] = useState(true);
  const [state, setState] = useState<"ok" | "login" | "missing" | "error">("ok");
  const [cancelAlasan, setCancelAlasan] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reservations/${id}`);
      if (res.status === 401) {
        setState("login");
        return;
      }
      if (res.status === 404) {
        setState("missing");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }
      const reservation = (await res.json()) as ReservationResult;
      setData(tampilanDetailReservasi(reservation));
      setState("ok");
    } catch {
      setState("error");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Pengecualian standar: fetch data saat id berubah.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadDetail();
  }, [loadDetail]);

  async function submitCancel() {
    if (!cancelAlasan.trim() || cancelLoading) return;
    setCancelLoading(true);
    setCancelResult(null);
    try {
      const res = await fetch(`/api/reservations/${id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ alasan: cancelAlasan.trim() }),
      });
      const payload = (await res.json().catch(() => null)) as { detail?: string; title?: string } | null;
      if (res.ok) {
        setCancelAlasan("");
        setConfirming(false);
        setCancelResult({ ok: true, msg: "Reservasi dibatalkan." });
        await loadDetail();
        return;
      }
      const msg = payload?.detail || payload?.title || `Gagal membatalkan (${res.status})`;
      setCancelResult({ ok: false, msg });
      if (res.status === 404 || res.status === 409) {
        setConfirming(false);
        await loadDetail();
      }
    } catch {
      setCancelResult({ ok: false, msg: "Kesalahan jaringan. Silakan coba lagi." });
    } finally {
      setCancelLoading(false);
    }
  }

  if (loading) {
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3" aria-hidden="true">
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2" aria-hidden="true">
          <Skeleton className="h-16 w-full rounded-card" />
          <Skeleton className="h-16 w-full rounded-card" />
          <Skeleton className="h-16 w-full rounded-card sm:col-span-2" />
          <Skeleton className="h-16 w-full rounded-card" />
          <Skeleton className="h-16 w-full rounded-card" />
        </div>
        <Skeleton className="h-40 w-full rounded-card" />
        <p className="sr-only">Memuat detail reservasi</p>
      </div>
    );
  }

  if (state === "login") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDays aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Masuk untuk melihat detail</EmptyTitle>
          <EmptyContent>
            <EmptyDescription>Detail reservasi hanya tersedia untuk pengguna yang masuk.</EmptyDescription>
          </EmptyContent>
        </EmptyHeader>
      </Empty>
    );
  }

  if (state === "missing" || (state === "ok" && !data)) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarDays aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Reservasi tidak ditemukan</EmptyTitle>
          <EmptyContent>
            <EmptyDescription>Reservasi tidak ada atau bukan milik Anda.</EmptyDescription>
          </EmptyContent>
        </EmptyHeader>
      </Empty>
    );
  }

  if (state === "error" || !data) {
    return <p className="text-sm text-destructive">Gagal memuat detail. Silakan coba lagi.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{data.namaFasilitas}</h1>
        <ReservationStatusBadge label={data.labelStatus} variant={data.varianStatus} />
      </header>

      {data.dibatalkanOlehPemeliharaan && (
        <section
          role="alert"
          aria-labelledby="banner-pemeliharaan-titel"
          className="flex flex-col gap-4 rounded-card border border-border bg-warning-subdued p-4 text-warning-subdued-foreground sm:flex-row sm:items-start sm:justify-between sm:gap-6"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Wrench aria-hidden="true" className="size-4 shrink-0" />
              <h2 id="banner-pemeliharaan-titel" className="font-heading text-base font-semibold">
                Dibatalkan karena pemeliharaan fasilitas
              </h2>
            </div>
            <p className="text-sm">
              Fasilitas <span className="font-medium">{data.namaFasilitas}</span> sedang dalam perbaikan,
              sehingga reservasi kamu pada{" "}
              <span className="font-medium">
                {data.tanggal} · {data.waktu}
              </span>{" "}
              dibatalkan otomatis. Kamu tidak perlu menghubungi petugas.
            </p>
          </div>
          <Button
            variant="soft"
            className="min-h-11 w-fit shrink-0 self-start"
            nativeButton={false}
            render={<Link href="/fasilitas" />}
          >
            Cari fasilitas lain
          </Button>
        </section>
      )}

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Fasilitas</dt>
          <dd className="font-medium">{data.ringkasanFasilitas}</dd>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Tanggal</dt>
          <dd className="font-medium">{data.tanggal}</dd>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Waktu</dt>
          <dd className="font-medium">{data.waktu}</dd>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Status</dt>
          <dd className="font-medium">{data.labelStatus}</dd>
        </div>
        <div className="rounded-card border border-border bg-card p-4 sm:col-span-2">
          <dt className="text-sm text-muted-foreground">Tujuan</dt>
          <dd className="font-medium">{data.tujuan}</dd>
        </div>
        {data.alasan && (
          <div className="rounded-card border border-border bg-card p-4 sm:col-span-2">
            <dt className="text-sm text-muted-foreground">Alasan</dt>
            <dd className="font-medium">{data.alasan}</dd>
          </div>
        )}
        <div className="rounded-card border border-border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Diajukan pada</dt>
          <dd className="font-medium">{data.diajukanPada}</dd>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Diproses pada</dt>
          <dd className="font-medium">{data.diprosesPada}</dd>
        </div>
      </dl>

      {data.dapatDibatalkan && (
        <section aria-label="Batalkan reservasi" className="flex flex-col gap-4 rounded-card border border-border bg-card p-4">
          <div>
            <h2 className="font-heading text-lg font-semibold">Batalkan reservasi</h2>
            <p className="text-sm text-muted-foreground">
              Pembatalan hanya dapat dilakukan paling lambat {BATAS_PEMBATALAN_JAM} jam sebelum waktu mulai.
              Setelah itu, hubungi petugas untuk bantuan.
            </p>
          </div>
          {!confirming ? (
            <Field>
              <FieldLabel htmlFor="alasan-batal">Alasan pembatalan</FieldLabel>
              <textarea
                id="alasan-batal"
                value={cancelAlasan}
                onChange={(e) => setCancelAlasan(e.target.value)}
                maxLength={BATAS_ALASAN_MAX}
                rows={2}
                placeholder="Contoh: Jadwal kegiatan berubah"
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <FieldDescription>{cancelAlasan.length}/{BATAS_ALASAN_MAX} karakter.</FieldDescription>
              <div>
                <Button
                  type="button"
                  variant="danger-soft"
                  className="min-h-11"
                  disabled={!cancelAlasan.trim() || cancelLoading}
                  onClick={() => setConfirming(true)}
                >
                  Batalkan reservasi
                </Button>
              </div>
            </Field>
          ) : (
            <div className="flex flex-col gap-3" role="group" aria-label="Konfirmasi pembatalan">
              <p className="text-sm">
                Yakin membatalkan reservasi <span className="font-medium">{data.namaFasilitas}</span> pada{" "}
                <span className="font-medium">
                  {data.tanggal} · {data.waktu}
                </span>
                ? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="danger"
                  className="min-h-11"
                  loading={cancelLoading}
                  disabled={cancelLoading}
                  onClick={submitCancel}
                >
                  Ya, batalkan
                </Button>
                <Button type="button" variant="outline" className="min-h-11" disabled={cancelLoading} onClick={() => setConfirming(false)}>
                  Kembali
                </Button>
              </div>
            </div>
          )}
          {cancelResult && (
            <p className={`text-sm font-medium ${cancelResult.ok ? "text-success-subdued-foreground" : "text-destructive"}`}>
              {cancelResult.msg}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
