"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";

import { LABEL_TIPE_FASILITAS } from "@/config/labels";
import { ReservationStatusBadge } from "@/components/reservation/reservation-status-badge";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/reservations/${id}`);
        if (cancelled) return;
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
        if (!cancelled) setState("error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
    </div>
  );
}
