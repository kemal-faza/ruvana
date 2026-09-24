"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarX2 } from "lucide-react";

import { BATAS_ALASAN_MAX } from "@/config/business";
import { ReservationStatusBadge } from "@/components/reservation/reservation-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import type { StaffReservationResult } from "@/lib/services/reservation-service";
import type { StatusReservasi } from "@/generated/prisma/enums";

interface ApprovedResponse {
  items: StaffReservationResult[];
  meta: { page: number; perPage: number; totalItems: number; totalPages: number };
}

const PER_PAGE = 10;

function formatTanggal(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1),
  );
}

// Daftar reservasi APPROVED untuk pembatalan mendesak oleh petugas
// (TASK 3.5). Alasan wajib diisi di client dan divalidasi ulang di server.
export function ApprovedReservationList() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApprovedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<"ok" | "login" | "forbidden" | "error">("ok");
  const [actingId, setActingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);
  const [cancelTarget, setCancelTarget] = useState<StaffReservationResult | null>(null);
  const [cancelAlasan, setCancelAlasan] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/reservations?status=APPROVED&page=${targetPage}&perPage=${PER_PAGE}`);
      if (res.status === 401) {
        setAccess("login");
        return;
      }
      if (res.status === 403) {
        setAccess("forbidden");
        return;
      }
      if (!res.ok) {
        setAccess("error");
        return;
      }
      setAccess("ok");
      setData((await res.json()) as ApprovedResponse);
    } catch {
      setAccess("error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Pengecualian standar: fetch data saat halaman berubah.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(page);
  }, [load, page]);

  function openCancelModal(item: StaffReservationResult) {
    setCancelTarget(item);
    setCancelAlasan("");
    setNotice(null);
    dialogRef.current?.showModal();
  }

  function closeCancelModal() {
    dialogRef.current?.close();
    setCancelTarget(null);
    setCancelAlasan("");
  }

  async function submitCancel() {
    if (!cancelTarget || !cancelAlasan.trim() || actingId !== null) return;
    setActingId(cancelTarget.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/staff/reservations/${cancelTarget.id}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ alasan: cancelAlasan.trim() }),
      });
      const payload = (await res.json().catch(() => null)) as { detail?: string; title?: string } | null;
      if (res.ok) {
        setNotice({ ok: true, msg: `Reservasi #${cancelTarget.id} dibatalkan. Slot kembali tersedia.` });
        closeCancelModal();
        await load(page);
        return;
      }
      setNotice({ ok: false, msg: payload?.detail || payload?.title || `Gagal membatalkan (${res.status})` });
      closeCancelModal();
      await load(page);
    } catch {
      setNotice({ ok: false, msg: "Error jaringan. Silakan coba lagi." });
    } finally {
      setActingId(null);
    }
  }

  if (access === "login") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarX2 aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Masuk sebagai petugas</EmptyTitle>
          <EmptyContent>
            <EmptyDescription>Daftar ini hanya tersedia untuk petugas atau admin yang masuk.</EmptyDescription>
          </EmptyContent>
        </EmptyHeader>
      </Empty>
    );
  }

  if (access === "forbidden") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CalendarX2 aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Akses ditolak</EmptyTitle>
          <EmptyContent>
            <EmptyDescription>Halaman ini membutuhkan role petugas atau admin.</EmptyDescription>
          </EmptyContent>
        </EmptyHeader>
      </Empty>
    );
  }

  const totalPages = data?.meta.totalPages ?? 0;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        Urut waktu mulai terdekat. Pembatalan mendesak membutuhkan alasan dan langsung membebaskan slot.
      </p>

      {notice && (
        <p aria-live="polite" className={`text-sm font-medium ${notice.ok ? "text-green-700" : "text-destructive"}`}>
          {notice.msg}
        </p>
      )}

      {loading && <p className="text-sm text-muted-foreground">Memuat reservasi disetujui…</p>}

      {!loading && access === "error" && (
        <p className="text-sm text-destructive">Gagal memuat daftar. Silakan coba lagi.</p>
      )}

      {!loading && access === "ok" && data && data.items.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarX2 aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Tidak ada reservasi disetujui</EmptyTitle>
            <EmptyContent>
              <EmptyDescription>Belum ada reservasi berstatus disetujui saat ini.</EmptyDescription>
            </EmptyContent>
          </EmptyHeader>
        </Empty>
      )}

      {!loading && access === "ok" && data && data.items.length > 0 && (
        <div className="flex flex-col gap-4">
          {data.items.map((item) => (
            <Card key={item.id}>
              <CardHeader>
                <CardTitle className="text-lg font-heading">
                  {item.facility.nama} · {formatTanggal(item.date)} · {item.startTime}–{item.endTime}
                </CardTitle>
                <CardDescription>
                  {item.pemohon.nama} ({item.pemohon.email}) · {item.tujuanPenggunaan}
                </CardDescription>
                <CardAction>
                  <ReservationStatusBadge status={item.status as StatusReservasi} />
                </CardAction>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>
                  Diajukan:{" "}
                  {new Intl.DateTimeFormat("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Jakarta",
                  }).format(new Date(item.submittedAt))}
                </p>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button
                  type="button"
                  variant="danger"
                  loading={actingId === item.id}
                  disabled={actingId !== null}
                  onClick={() => openCancelModal(item)}
                >
                  Batalkan mendesak
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {!loading && access === "ok" && data && totalPages > 1 && (
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

      <dialog
        ref={dialogRef}
        aria-label="Batalkan reservasi mendesak"
        onClose={() => {
          setCancelTarget(null);
          setCancelAlasan("");
        }}
        className="w-full max-w-md rounded-card border border-border bg-card p-0 text-foreground backdrop:bg-black/50"
      >
        <form
          method="dialog"
          className="flex flex-col gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submitCancel();
          }}
        >
          <div>
            <h2 className="font-heading text-lg font-semibold">Batalkan mendesak #{cancelTarget?.id}</h2>
            <p className="text-sm text-muted-foreground">
              Alasan wajib diisi dan akan terlihat oleh pemilik reservasi. Slot langsung tersedia lagi.
            </p>
          </div>
          <Field>
            <FieldLabel htmlFor="alasan-batal-petugas">Alasan pembatalan mendesak</FieldLabel>
            <textarea
              id="alasan-batal-petugas"
              value={cancelAlasan}
              onChange={(e) => setCancelAlasan(e.target.value)}
              maxLength={BATAS_ALASAN_MAX}
              rows={3}
              required
              placeholder="Contoh: Fasilitas mendadak tidak bisa dipakai karena kebocoran atap"
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <FieldDescription>{cancelAlasan.length}/{BATAS_ALASAN_MAX} karakter.</FieldDescription>
          </Field>
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="danger"
              loading={actingId !== null}
              disabled={!cancelAlasan.trim() || actingId !== null}
            >
              Batalkan reservasi
            </Button>
            <Button type="button" variant="outline" disabled={actingId !== null} onClick={closeCancelModal}>
              Kembali
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
