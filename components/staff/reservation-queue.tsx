"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ClipboardList } from "lucide-react";

import { BATAS_ALASAN_MAX, ZONA_WAKTU } from "@/config/business";
import { ReservationStatusBadge } from "@/components/reservation/reservation-status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import type { StaffReservationResult } from "@/lib/services/reservation-service";
import type { StatusReservasi } from "@/generated/prisma/enums";

interface QueueResponse {
  items: StaffReservationResult[];
  meta: { page: number; perPage: number; totalItems: number; totalPages: number };
}

interface ProblemBody {
  detail?: string;
  title?: string;
  code?: string;
}

type QueueNotice =
  | { kind: "success"; msg: string }
  | { kind: "error"; msg: string; itemId: number; scope: "card" | "modal" | "top" };

const PER_PAGE = 10;

function formatTanggal(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1),
  );
}

function classifyFailure(status: number, code?: string): "conflict" | "stale" | "validation" | "other" {
  if (status === 409 && code === "APPROVAL_CONFLICT") return "conflict";
  if (status === 404 || code === "NOT_FOUND" || code === "INVALID_RESERVATION_TRANSITION") return "stale";
  if (status === 422 || status === 400 || code === "VALIDATION_FAILED" || code === "BAD_REQUEST") return "validation";
  return "other";
}

function AlertMessage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <p ref={ref} role="alert" tabIndex={-1} className="text-sm font-medium text-destructive">
      {children}
    </p>
  );
}

export function ReservationQueue() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<QueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<"ok" | "login" | "forbidden" | "error">("ok");
  const [actingId, setActingId] = useState<number | null>(null);
  const [actingKind, setActingKind] = useState<"approve" | "reject" | null>(null);
  const [notice, setNotice] = useState<QueueNotice | null>(null);
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

  async function submitApprove(item: StaffReservationResult) {
    if (actingId !== null) return;
    setActingId(item.id);
    setActingKind("approve");
    setNotice(null);
    try {
      const res = await fetch(`/api/staff/reservations/${item.id}/approve`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as ProblemBody | null;
      if (res.ok) {
        setNotice({
          kind: "success",
          msg: `Reservasi ${item.facility.nama} pada ${formatTanggal(item.date)} pukul ${item.startTime}–${item.endTime} telah disetujui.`,
        });
        await load(page);
        return;
      }
      const kegagalan = classifyFailure(res.status, payload?.code);
      const msg = payload?.detail || payload?.title || "Gagal menyetujui. Silakan coba lagi.";
      setNotice({ kind: "error", msg, itemId: item.id, scope: "card" });
      if (kegagalan === "stale") {
        await load(page);
      }
    } catch {
      setNotice({ kind: "error", msg: "Kesalahan jaringan. Silakan coba lagi.", itemId: item.id, scope: "card" });
    } finally {
      setActingId(null);
      setActingKind(null);
    }
  }

  async function submitReject() {
    if (!rejectTarget || !rejectAlasan.trim() || actingId !== null) return;
    const target = rejectTarget;
    setActingId(target.id);
    setActingKind("reject");
    setNotice(null);
    try {
      const res = await fetch(`/api/staff/reservations/${target.id}/reject`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ alasan: rejectAlasan.trim() }),
      });
      const payload = (await res.json().catch(() => null)) as ProblemBody | null;
      if (res.ok) {
        setNotice({
          kind: "success",
          msg: `Reservasi ${target.facility.nama} pada ${formatTanggal(target.date)} pukul ${target.startTime}–${target.endTime} telah ditolak.`,
        });
        closeRejectModal();
        await load(page);
        return;
      }
      const kegagalan = classifyFailure(res.status, payload?.code);
      const msg = payload?.detail || payload?.title || "Gagal menolak. Silakan coba lagi.";
      if (kegagalan === "stale") {
        closeRejectModal();
        setNotice({ kind: "error", msg, itemId: target.id, scope: "top" });
        await load(page);
        return;
      }
      setNotice({ kind: "error", msg, itemId: target.id, scope: "modal" });
    } catch {
      setNotice({ kind: "error", msg: "Kesalahan jaringan. Silakan coba lagi.", itemId: target.id, scope: "modal" });
    } finally {
      setActingId(null);
      setActingKind(null);
    }
  }

  if (access === "login") {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <ClipboardList aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Masuk sebagai petugas atau admin untuk melihat antrean reservasi.</EmptyTitle>
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
          <EmptyTitle>Antrean reservasi hanya untuk petugas atau admin.</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  const totalPages = data?.meta.totalPages ?? 0;
  const noticeErrorAtTop =
    notice?.kind === "error" &&
    (notice.scope === "top" ||
      (notice.scope === "card" && (loading || !data?.items.some((item) => item.id === notice.itemId))));

  return (
    <div className="flex flex-col gap-5">
      {notice?.kind === "success" && (
        <p aria-live="polite" className="text-sm font-medium text-success-subdued-foreground">
          {notice.msg}
        </p>
      )}

      {noticeErrorAtTop && notice?.kind === "error" && (
        <AlertMessage key={`${notice.itemId}-${notice.msg}`}>{notice.msg}</AlertMessage>
      )}

      {loading && (
        <div role="status" aria-busy="true" className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-3 rounded-card border border-border bg-card p-5" aria-hidden="true">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-3">
                <Skeleton className="h-11 w-28" />
                <Skeleton className="h-11 w-24" />
              </div>
            </div>
          ))}
          <p className="sr-only">Memuat antrean</p>
        </div>
      )}

      {!loading && access === "error" && (
        <p className="text-sm text-destructive">Gagal memuat antrean. Silakan coba lagi.</p>
      )}

      {!loading && access === "ok" && data && data.items.length === 0 && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>Belum ada reservasi yang menunggu.</EmptyTitle>
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
                    timeZone: ZONA_WAKTU,
                  }).format(new Date(item.submittedAt))}
                </p>
                {notice?.kind === "error" && notice.scope === "card" && notice.itemId === item.id && !loading && (
                  <AlertMessage key={`${notice.itemId}-${notice.msg}`}>{notice.msg}</AlertMessage>
                )}
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button
                  type="button"
                  className="min-h-11"
                  loading={actingKind === "approve" && actingId === item.id}
                  loadingLabel="Memproses…"
                  disabled={actingId !== null}
                  onClick={() => void submitApprove(item)}
                >
                  Setujui
                </Button>
                <Button
                  type="button"
                  variant="danger-soft"
                  className="min-h-11"
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
            <h2 className="font-heading text-lg font-semibold">
              {rejectTarget
                ? `Tolak reservasi ${rejectTarget.facility.nama} · ${formatTanggal(rejectTarget.date)}`
                : "Tolak reservasi"}
            </h2>
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
          {notice?.kind === "error" && notice.scope === "modal" && (
            <AlertMessage key={`${notice.itemId}-${notice.msg}`}>{notice.msg}</AlertMessage>
          )}
          <div className="flex gap-3">
            <Button
              type="submit"
              variant="danger"
              className="min-h-11"
              loading={actingKind === "reject"}
              loadingLabel="Memproses…"
              disabled={!rejectAlasan.trim() || actingId !== null}
            >
              Tolak reservasi
            </Button>
            <Button type="button" variant="outline" className="min-h-11" disabled={actingId !== null} onClick={closeRejectModal}>
              Batal
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
