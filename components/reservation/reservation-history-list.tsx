"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";

import { STATUS_RESERVASI } from "@/config/business";
import { LABEL_STATUS_RESERVASI } from "@/config/labels";
import { ReservationStatusBadge } from "@/components/reservation/reservation-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ReservationResult } from "@/lib/services/reservation-service";
import type { StatusReservasi } from "@/generated/prisma/enums";

interface HistoryResponse {
  items: ReservationResult[];
  meta: { page: number; perPage: number; totalItems: number; totalPages: number };
}

const PER_PAGE = 10;
const SEMUA = "SEMUA";

function formatTanggal(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1),
  );
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
      const badan = (await res.json().catch(() => null)) as HistoryResponse | null;
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
      setData(badan);
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

  return (
    <div className="flex flex-col gap-5">
      <Field className="max-w-xs">
        <FieldLabel htmlFor="filter-status">Filter status</FieldLabel>
        <Select
          value={statusFilter || SEMUA}
          onValueChange={gantiFilter}
        >
          <SelectTrigger id="filter-status" className="w-full">
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
      </Field>

      {loading && <p className="text-sm text-muted-foreground">Memuat riwayat reservasi…</p>}

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
            variant="outline"
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
          <Button type="button" variant="outline" className="min-h-11" onClick={cobaLagi}>
            Coba lagi
          </Button>
        </div>
      )}

      {!loading && !galat && data && data.items.length === 0 && (
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

      {!loading && !galat && data && data.items.length > 0 && (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          {data.items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="text-lg font-heading">{item.facility.nama}</CardTitle>
                <CardDescription>
                  {formatTanggal(item.date)} · {item.startTime}–{item.endTime}
                </CardDescription>
                <CardAction>
                  <ReservationStatusBadge status={item.status as StatusReservasi} />
                </CardAction>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p className="line-clamp-2">{item.tujuanPenggunaan}</p>
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

      {!loading && !galat && data && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
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
