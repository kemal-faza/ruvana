"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardList } from "lucide-react";

import { BATAS_ALASAN_MAX } from "@/config/business";
import { ReservationStatusBadge } from "@/components/reservation/reservation-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import type { StaffReservationResult } from "@/lib/services/reservation-service";
import type { StatusReservasi } from "@/generated/prisma/enums";

interface QueueResponse {
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

export function ReservationQueue() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<"ok" | "login" | "forbidden" | "error">("ok");
  const [actingId, setActingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<StaffReservationResult | null>(null);
  const [rejectAlasan, setRejectAlasan] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const load = useCallback(async (targetPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/staff/reservations?page=${targetPage}&perPage=${PER_PAGE}`);
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
      setData((await res.json()) as QueueResponse);
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

  function openRejectModal(item: StaffReservationResult) {
    setRejectTarget(item);
    setRejectAlasan("");
    setNotice(null);
    dialogRef.current?.showModal();
  }

  function closeRejectModal() {
    dialogRef.current?.close();
    setRejectTarget(null);
    setRejectAlasan("");
  }

  async function submitApprove(id: number) {
    if (actingId !== null) return;
    setActingId(id);
    setNotice(null);
    try {
      const res = await fetch(`/api/staff/reservations/${id}/approve`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as { detail?: string; title?: string } | null;
      if (res.ok) {
        setNotice({ ok: true, msg: `Reservasi #${id} disetujui.` });
        await load(page);
        return;
      }
      setNotice({ ok: false, msg: payload?.detail || payload?.title || `Gagal menyetujui (${res.status})` });
      await load(page);
    } catch {
      setNotice({ ok: false, msg: "Error jaringan. Silakan coba lagi." });
    } finally {
      setActingId(null);
    }
  }

  async function submitReject() {
    if (!rejectTarget || !rejectAlasan.trim() || actingId !== null) return;
    setActingId(rejectTarget.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/staff/reservations/${rejectTarget.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ alasan: rejectAlasan.trim() }),
      });
      const payload = (await res.json().catch(() => null)) as { detail?: string; title?: string } | null;
      if (res.ok) {
        setNotice({ ok: true, msg: `Reservasi #${rejectTarget.id} ditolak.` });
        closeRejectModal();
        await load(page);
        return;
      }
      setNotice({ ok: false, msg: payload?.detail || payload?.title || `Gagal menolak (${res.status})` });
      closeRejectModal();
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
            <ClipboardList aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Masuk sebagai petugas</EmptyTitle>
          <EmptyContent>
            <EmptyDescription>Antrean reservasi hanya tersedia untuk petugas atau admin yang masuk.</EmptyDescription>
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
            <ClipboardList aria-hidden="true" />
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
        Urutan FIFO: pengajuan paling lama menunggu diproses lebih dulu.
      </p>

      {notice && (
        <p aria-live="polite" className={`text-sm font-medium ${notice.ok ? "text-green-700" : "text-destructive"}`}>
          {notice.msg}
        </p>
      )}

      {loading && <p className="text-sm text-muted-foreground">Memuat antrean…</p>}

      {!loading && access === "error" && (
        <p className="text-sm text-destructive">Gagal memuat antrean. Silakan coba lagi.</p>
      )}

      {!loading && access === "ok" && data && data.items.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Antrean kosong</EmptyTitle>
            <EmptyContent>
              <EmptyDescription>Tidak ada reservasi menunggu saat ini.</EmptyDescription>
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
                  loading={actingId === item.id}
                  disabled={actingId !== null}
                  onClick={() => void submitApprove(item.id)}
                >
                  Setujui
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={actingId !== null}
                  onClick={() => openRejectModal(item)}
                >
                  Tolak
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
        aria-label="Tolak reservasi"
        onClose={() => {
          setRejectTarget(null);
          setRejectAlasan("");
        }}
        className="w-full max-w-md rounded-card border border-border bg-card p-0 text-foreground backdrop:bg-black/50"
      >
        <form
          method="dialog"
          className="flex flex-col gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submitReject();
          }}
        >
          <div>
            <h2 className="font-heading text-lg font-semibold">Tolak reservasi #{rejectTarget?.id}</h2>
            <p className="text-sm text-muted-foreground">Alasan wajib diisi dan akan terlihat oleh pemohon.</p>
          </div>
          <Field>
            <FieldLabel htmlFor="alasan-tolak">Alasan penolakan</FieldLabel>
            <textarea
              id="alasan-tolak"
              value={rejectAlasan}
              onChange={(e) => setRejectAlasan(e.target.value)}
              maxLength={BATAS_ALASAN_MAX}
              rows={3}
              required
              placeholder="Contoh: Kapasitas tidak mencukupi"
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <FieldDescription>{rejectAlasan.length}/{BATAS_ALASAN_MAX} karakter.</FieldDescription>
          </Field>
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="danger"
              loading={actingId !== null}
              disabled={!rejectAlasan.trim() || actingId !== null}
            >
              Tolak reservasi
            </Button>
            <Button type="button" variant="outline" disabled={actingId !== null} onClick={closeRejectModal}>
              Batal
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
