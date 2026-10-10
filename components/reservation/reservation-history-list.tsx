"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";

import { STATUS_RESERVASI } from "@/config/business";
import { LABEL_STATUS_RESERVASI } from "@/config/labels";
import { ReservationStatusBadge } from "@/components/reservation/reservation-status-badge";
import { tampilanReservasi, type VarianBadgeReservasi } from "@/lib/reservations/reservation-display";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SELECT_TRIGGER_ACTION_CLASS } from "@/components/ui/select-classes";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ReservationResult } from "@/lib/services/reservation-service";
import type { StatusReservasi } from "@/generated/prisma/enums";

interface HistoryResponse {
  items: HistoryItemView[];
  meta: { page: number; perPage: number; totalItems: number; totalPages: number };
}

interface HistoryApiResponse {
  items: ReservationResult[];
  meta: HistoryResponse["meta"];
}

interface HistoryItemView {
  id: number;
  facilityName: string;
  tanggal: string;
  waktu: string;
  labelStatus: string;
  varianStatus: VarianBadgeReservasi;
  tujuan: string;
  alasan: string | null;
}

const PER_PAGE = 10;
const SEMUA = "SEMUA";

// Pemetaan value->label untuk Base UI Select: tanpa `items`, <SelectValue/>
// merender string value mentah (enum) di trigger. Daftar ini memakai
// LABEL_STATUS_RESERVASI yang sama dengan opsi dropdown, jadi trigger selalu
// menampilkan label domain Indonesia sedangkan value (enum) tetap dipakai
// untuk query API.
const ITEM_FILTER_STATUS: Array<{ value: string; label: string }> = [
  { value: SEMUA, label: "Semua status" },
  ...STATUS_RESERVASI.map((status) => ({
    value: status,
    label: LABEL_STATUS_RESERVASI[status as StatusReservasi],
  })),
];

function toHistoryItemView(item: ReservationResult): HistoryItemView {
  const tampilan = tampilanReservasi({
    status: item.status,
    date: item.date,
    startTime: item.startTime,
    endTime: item.endTime,
    submittedAt: item.submittedAt,
    processedAt: item.processedAt,
  });

  return {
    id: item.id,
    facilityName: item.facility.nama,
    tanggal: tampilan.tanggal,
    waktu: tampilan.waktu,
    labelStatus: tampilan.labelStatus,
    varianStatus: tampilan.varianStatus,
    tujuan: item.tujuanPenggunaan,
    alasan: item.alasan,
  };
}

export function ReservationHistoryList() {
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // Jenis kegagalan dibaca dari status HTTP dan bentuk respons, bukan dari
  // string pesan server: "sesi" (401), "jaringan" (gagal fetch/5xx/200 tak
  // sesuai kontrak). 422 khusus field status ditangani terpisah di bawah.
  const [galat, setGalat] = useState<"sesi" | "jaringan" | null>(null);
  const [pemberitahuan, setPemberitahuan] = useState<string | null>(null);
  // Penomoran request: respons basi (filter/page sudah berganti) diabaikan
  // agar tidak menimpa hasil terbaru.
  const requestRef = useRef(0);

  const load = useCallback(async (status: string, targetPage: number) => {
    const nomor = ++requestRef.current;
    const masihBaru = () => nomor === requestRef.current;
    setLoading(true);
    setGalat(null);
    try {
      const qs = new URLSearchParams({ page: String(targetPage), perPage: String(PER_PAGE) });
      if (status) qs.set("status", status);
      const res = await fetch(`/api/reservations?${qs.toString()}`);
      if (!masihBaru()) return;
      if (res.status === 401) {
        setGalat("sesi");
        setData(null);
        return;
      }
      if (!res.ok) {
        if (res.status === 422) {
          const badan = (await res.json().catch(() => null)) as {
            errors?: Array<{ field?: unknown }>;
          } | null;
          const galatList = badan?.errors;
          if (
            Array.isArray(galatList) &&
            galatList.length > 0 &&
            galatList.every((item) => item?.field === "status")
          ) {
            // Nilai filter tak dikenal server: kembali ke Semua status dan
            // muat ulang tanpa filter, bukan menampilkan kotak error.
            setStatusFilter("");
            setPage(1);
            setPemberitahuan("Filter status tidak dikenal. Menampilkan semua reservasi.");
            return;
          }
        }
        setGalat("jaringan");
        return;
      }
      const badan = (await res.json().catch(() => null)) as HistoryApiResponse | null;
      if (!masihBaru()) return;
      // Validasi bentuk kontrak sebelum render: respons 200 yang kehilangan
      // meta/items tidak boleh crash (totalPages diakses saat render).
      if (
        !badan ||
        !Array.isArray(badan.items) ||
        !badan.meta ||
        typeof badan.meta.page !== "number" ||
        typeof badan.meta.perPage !== "number" ||
        typeof badan.meta.totalItems !== "number" ||
        typeof badan.meta.totalPages !== "number"
      ) {
        setGalat("jaringan");
        return;
      }
      setData({ ...badan, items: badan.items.map(toHistoryItemView) });
    } catch {
      if (masihBaru()) setGalat("jaringan");
    } finally {
      if (masihBaru()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Pengecualian standar: fetch data saat filter/halaman berubah.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(statusFilter, page);
  }, [load, statusFilter, page]);

  function gantiFilter(nilai: string | null) {
    setStatusFilter(nilai && nilai !== SEMUA ? nilai : "");
    setPage(1);
    setPemberitahuan(null);
  }

  function cobaLagi() {
    setPemberitahuan(null);
    void load(statusFilter, page);
  }

  const totalPages = data?.meta.totalPages ?? 0;
  // Skeleton hanya untuk muat pertama; saat ganti filter daftar lama tetap
  // tampil sekalian ditandai sedang memuat.
  const refetching = Boolean(loading && data);

  return (
    <div className="flex flex-col gap-5">
      <Field className="max-w-xs">
        <FieldLabel htmlFor="filter-status">Filter status</FieldLabel>
        <Select
          items={ITEM_FILTER_STATUS}
          value={statusFilter || SEMUA}
          onValueChange={gantiFilter}
        >
          <SelectTrigger id="filter-status" className={`${SELECT_TRIGGER_ACTION_CLASS} w-full`}>
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SEMUA}>Semua status</SelectItem>
            {STATUS_RESERVASI.map((status) => (
              <SelectItem key={status} value={status}>
                {LABEL_STATUS_RESERVASI[status as StatusReservasi]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {refetching && (
          <p aria-live="polite" className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Memuat…
          </p>
        )}
      </Field>

      {loading && !data && (
        <div role="status" aria-busy="true" className="flex flex-col gap-4">
          <div className="grid min-w-0 gap-4 sm:grid-cols-2" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-4 rounded-card border border-border bg-card p-6">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
          </div>
          <p className="sr-only">Memuat riwayat reservasi</p>
        </div>
      )}

      {pemberitahuan && (
        <p aria-live="polite" className="text-sm text-muted-foreground">
          {pemberitahuan}
        </p>
      )}

      {!loading && galat === "sesi" && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">Sesi Anda berakhir. Silakan masuk lagi.</p>
          <Button
            type="button"
            variant="soft"
            className="min-h-11"
            render={<Link href="/login" />}
          >
            Masuk
          </Button>
        </div>
      )}

      {!loading && galat === "jaringan" && (
        <div role="alert" className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">Riwayat belum dapat dimuat.</p>
          <Button type="button" variant="soft" className="min-h-11" onClick={cobaLagi}>
            Coba lagi
          </Button>
        </div>
      )}

      {!galat && data && data.items.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarDays aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Belum ada reservasi</EmptyTitle>
            <EmptyContent>
              <EmptyDescription>
                {statusFilter
                  ? "Tidak ada reservasi dengan status ini."
                  : "Riwayat reservasi Anda masih kosong. Ajukan reservasi pertama Anda."}
              </EmptyDescription>
            </EmptyContent>
          </EmptyHeader>
        </Empty>
      )}

      {data && data.items.length > 0 && (
        <div
          className={cn(
            "grid min-w-0 gap-4 transition-opacity duration-300 sm:grid-cols-2 motion-reduce:transition-none",
            refetching && "opacity-60",
          )}
          aria-busy={refetching || undefined}
        >
          {data.items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="text-lg font-heading">{item.facilityName}</CardTitle>
                <CardDescription>
                  {item.tanggal} · {item.waktu}
                </CardDescription>
                <CardAction>
                  <ReservationStatusBadge label={item.labelStatus} variant={item.varianStatus} />
                </CardAction>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="line-clamp-2">{item.tujuan}</p>
                {item.alasan && (
                  <p className="mt-1 line-clamp-2">
                    <span className="font-medium text-foreground">Alasan: </span>
                    {item.alasan}
                  </p>
                )}
              </CardContent>
              <CardFooter className="mt-auto">
                <Button
                  variant="outline"
                  className="min-h-11 w-full"
                  nativeButton={false}
                  render={<Link href={`/reservasi/riwayat/${item.id}`} />}
                >
                  Lihat detail
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {data && data.items.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Sebelumnya
          </Button>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Halaman {data.meta.page} dari {totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}
    </div>
  );
}
