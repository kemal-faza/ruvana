"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

import { BATAS_PEMBATALAN_JAM } from "@/config/business";
import { LABEL_TIPE_FASILITAS } from "@/config/labels";
import { ReservationStatusBadge } from "@/components/reservation/reservation-status-badge";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import type { ReservationResult } from "@/lib/services/reservation-service";
import type { StatusReservasi, TipeFasilitas } from "@/generated/prisma/enums";

function formatTanggal(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(
    new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1),
  );
}

function formatInstant(iso: string | null): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(iso));
}

export function ReservationDetail({ id }: { id: number }) {
  const [data, setData] = useState<ReservationResult | null>(null);
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
      setData((await res.json()) as ReservationResult);
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
      // Status mungkin berubah di server (mis. sudah diproses) — sinkronkan tampilan
      if (res.status === 404 || res.status === 409) {
        setConfirming(false);
        await loadDetail();
      }
    } catch {
      setCancelResult({ ok: false, msg: "Error jaringan. Silakan coba lagi." });
    } finally {
      setCancelLoading(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Memuat detail reservasi…</p>;
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
        <h1 className="font-heading text-3xl font-semibold tracking-tight">{data.facility.nama}</h1>
        <ReservationStatusBadge status={data.status as StatusReservasi} />
      </header>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-card border border-border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Fasilitas</dt>
          <dd className="font-medium">
            {LABEL_TIPE_FASILITAS[data.facility.tipe as TipeFasilitas]} · {data.facility.lokasi}
          </dd>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Waktu</dt>
          <dd className="font-medium">
            {formatTanggal(data.date)} · {data.startTime}–{data.endTime}
          </dd>
        </div>
        <div className="rounded-card border border-border bg-card p-4 sm:col-span-2">
          <dt className="text-sm text-muted-foreground">Tujuan penggunaan</dt>
          <dd className="font-medium">{data.tujuanPenggunaan}</dd>
        </div>
        {data.alasan && (
          <div className="rounded-card border border-border bg-card p-4 sm:col-span-2">
            <dt className="text-sm text-muted-foreground">Alasan</dt>
            <dd className="font-medium">{data.alasan}</dd>
          </div>
        )}
        <div className="rounded-card border border-border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Diajukan pada</dt>
          <dd className="font-medium">{formatInstant(data.submittedAt)}</dd>
        </div>
        <div className="rounded-card border border-border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Diproses pada</dt>
          <dd className="font-medium">{formatInstant(data.processedAt)}</dd>
        </div>
      </dl>

      {(data.status === "PENDING" || data.status === "APPROVED") && (
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
                maxLength={500}
                rows={2}
                placeholder="Contoh: Jadwal kegiatan berubah"
                className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              />
              <FieldDescription>{cancelAlasan.length}/500 karakter.</FieldDescription>
              <div>
                <Button
                  type="button"
                  variant="danger"
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
                Yakin membatalkan reservasi <span className="font-medium">{data.facility.nama}</span> pada{" "}
                <span className="font-medium">
                  {formatTanggal(data.date)} · {data.startTime}–{data.endTime}
                </span>
                ? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="danger"
                  loading={cancelLoading}
                  disabled={cancelLoading}
                  onClick={submitCancel}
                >
                  Ya, batalkan
                </Button>
                <Button type="button" variant="outline" disabled={cancelLoading} onClick={() => setConfirming(false)}>
                  Kembali
                </Button>
              </div>
            </div>
          )}
          {cancelResult && (
            <p className={`text-sm font-medium ${cancelResult.ok ? "text-green-700" : "text-destructive"}`}>
              {cancelResult.msg}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
