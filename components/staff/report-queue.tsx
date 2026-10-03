"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardList, FileImage, MapPin, UserRound, Wrench } from "lucide-react";

import { BUTTON_ACTION_CLASS, Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportStatusBadge } from "@/components/reports/report-status-badge";
import { formatWaktu } from "@/components/reports/format";
import { LABEL_TIPE_FASILITAS } from "@/config/labels";
import { MAKS_CATATAN_RESOLUSI_LAPORAN } from "@/config/business";
import type { AntreanLaporan } from "@/lib/validation/report-processing";
import type { StaffReportCollection, StaffReportResult } from "@/lib/services/report-processing-service";

const PER_PAGE = 20;

const KETERANGAN_ANTREAN: Record<AntreanLaporan, { title: string; description: string; kosong: string }> = {
  intake: {
    title: "Laporan masuk",
    description: "Laporan baru yang belum ditangani. Antrean ini tidak memuat pekerjaan yang sudah berjalan.",
    kosong: "Tidak ada laporan baru yang menunggu.",
  },
  work: {
    title: "Daftar pekerjaan",
    description: "Laporan baru dan yang sedang ditangani agar pekerjaan berjalan tetap dapat ditemukan dan diselesaikan.",
    kosong: "Tidak ada pekerjaan laporan yang perlu ditangani.",
  },
};

interface ReportQueueResponse {
  access: "ok" | "login" | "forbidden" | "error";
  data: StaffReportCollection | null;
}

function kosongState(access: ReportQueueResponse["access"], queue: AntreanLaporan) {
  if (access === "login") {
    return {
      title: "Masuk sebagai petugas",
      description: "Antrean laporan hanya tersedia untuk petugas atau admin yang masuk.",
    };
  }
  if (access === "forbidden") {
    return {
      title: "Akses ditolak",
      description: "Halaman ini membutuhkan role petugas atau admin.",
    };
  }
  if (access === "error") {
    return {
      title: "Gagal memuat antrean",
      description: "Antrean laporan tidak dapat dimuat. Silakan muat ulang halaman.",
    };
  }
  return { title: KETERANGAN_ANTREAN[queue].kosong, description: "Ringkasan di dasbor petugas tetap diperbarui otomatis." };
}

export function ReportQueue({ queue }: { queue: AntreanLaporan }) {
  const [page, setPage] = useState(1);
  const [state, setState] = useState<ReportQueueResponse>({ access: "ok", data: null });
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);
  const [finalize, setFinalize] = useState<{ report: StaffReportResult; tujuan: "resolve" | "reject" } | null>(null);
  const [catatan, setCatatan] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);

  const meta = KETERANGAN_ANTREAN[queue];

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/staff/reports?queue=${queue}&page=${targetPage}&perPage=${PER_PAGE}`,
        );
        if (res.status === 401) {
          setState({ access: "login", data: null });
          return;
        }
        if (res.status === 403) {
          setState({ access: "forbidden", data: null });
          return;
        }
        if (!res.ok) {
          setState({ access: "error", data: null });
          return;
        }
        setState({ access: "ok", data: (await res.json()) as StaffReportCollection });
      } catch {
        setState({ access: "error", data: null });
      } finally {
        setLoading(false);
      }
    },
    [queue],
  );

  useEffect(() => {
    // Pengecualian standar: fetch data saat antrean atau halaman berubah.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load(page);
  }, [load, page]);

  function openFinalize(report: StaffReportResult, tujuan: "resolve" | "reject") {
    setFinalize({ report, tujuan });
    setCatatan("");
    setNotice(null);
    dialogRef.current?.showModal();
  }

  function closeFinalize() {
    dialogRef.current?.close();
    setFinalize(null);
    setCatatan("");
  }

  async function start(report: StaffReportResult) {
    if (actingId !== null) return;
    setActingId(report.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/staff/reports/${report.id}/start`, { method: "POST" });
      const payload = (await res.json().catch(() => null)) as { detail?: string } | null;
      if (res.ok) {
        setNotice({
          ok: true,
          msg: `Laporan #LP-${report.id.toString().padStart(4, "0")} di ${report.facility.nama} ditandai sedang ditangani.`,
        });
        await load(page);
        return;
      }
      setNotice({ ok: false, msg: payload?.detail ?? "Gagal memulai penanganan. Silakan coba lagi." });
      await load(page);
    } catch {
      setNotice({ ok: false, msg: "Kesalahan jaringan. Silakan coba lagi." });
    } finally {
      setActingId(null);
    }
  }

  async function submitFinalize() {
    if (!finalize || !catatan.trim() || actingId !== null) return;
    const { report, tujuan } = finalize;
    setActingId(report.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/staff/reports/${report.id}/${tujuan}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ catatanResolusi: catatan.trim() }),
      });
      const payload = (await res.json().catch(() => null)) as { detail?: string } | null;
      if (res.ok) {
        setNotice({
          ok: true,
          msg:
            tujuan === "resolve"
              ? `Laporan #LP-${report.id.toString().padStart(4, "0")} ditandai selesai.`
              : `Laporan #LP-${report.id.toString().padStart(4, "0")} ditolak.`,
        });
        closeFinalize();
        await load(page);
        return;
      }
      setNotice({ ok: false, msg: payload?.detail ?? "Gagal menyimpan hasil penanganan. Silakan coba lagi." });
      closeFinalize();
      await load(page);
    } catch {
      setNotice({ ok: false, msg: "Kesalahan jaringan. Silakan coba lagi." });
    } finally {
      setActingId(null);
    }
  }

  const totalPages = state.data?.meta.totalPages ?? 0;

  return (
    <section aria-label={meta.title} className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h2 className="font-heading text-xl font-semibold tracking-tight">{meta.title}</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">{meta.description}</p>
      </header>

      {notice && (
        <p
          aria-live="polite"
          className={`text-sm font-medium ${
            notice.ok ? "text-success-subdued-foreground" : "text-destructive"
          }`}
        >
          {notice.msg}
        </p>
      )}

      {loading && (
        <div role="status" aria-busy="true" className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-card border border-border bg-card p-5"
              aria-hidden="true"
            >
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-40" />
              <div className="flex gap-3">
                <Skeleton className="h-11 w-28" />
                <Skeleton className="h-11 w-24" />
              </div>
            </div>
          ))}
          <p className="sr-only">Memuat antrean laporan</p>
        </div>
      )}

      {!loading && (state.data === null || state.data.items.length === 0) && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardList aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{kosongState(state.access, queue).title}</EmptyTitle>
            <EmptyContent>
              <EmptyDescription>{kosongState(state.access, queue).description}</EmptyDescription>
            </EmptyContent>
          </EmptyHeader>
        </Empty>
      )}

      {!loading && state.data && state.data.items.length > 0 && (
        <div className="flex flex-col gap-4">
          {state.data.items.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  {report.facility.nama} · {report.kategori}
                </CardTitle>
                <CardDescription>
                  <span className="inline-flex items-center gap-1">
                    <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                    {report.facility.lokasi} · {LABEL_TIPE_FASILITAS[report.facility.tipe]}
                  </span>
                </CardDescription>
                <CardAction>
                  <ReportStatusBadge status={report.status} />
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
                <p className="text-foreground">{report.deskripsi}</p>
                <p className="inline-flex items-center gap-1.5">
                  <UserRound aria-hidden="true" className="size-3.5 shrink-0" />
                  {report.pelapor.nama} ({report.pelapor.email})
                </p>
                <p className="inline-flex items-center gap-1.5">
                  <FileImage aria-hidden="true" className="size-3.5 shrink-0" />
                  {report.foto.hasPhoto
                    ? `Foto terlampir (${report.foto.contentType}, ${Math.round((report.foto.size ?? 0) / 1024)} KB)`
                    : "Tanpa foto"}
                </p>
                <p>Diajukan: {formatWaktu(report.createdAt)}</p>
                {report.ditanganiOleh ? (
                  <p className="inline-flex items-center gap-1.5">
                    <Wrench aria-hidden="true" className="size-3.5 shrink-0" />
                    Ditangani {report.ditanganiOleh.nama}
                    {report.processedAt ? ` · ${formatWaktu(report.processedAt)}` : ""}
                  </p>
                ) : null}
                {report.catatanResolusi ? (
                  <p className="rounded-card border border-border bg-muted/40 p-3 text-foreground">
                    Catatan: {report.catatanResolusi}
                  </p>
                ) : null}
              </CardContent>
              <div className="flex flex-wrap gap-3 px-6 pb-6">
                {report.status === "NEW" && (
                  <Button
                    type="button"
                    className={BUTTON_ACTION_CLASS}
                    loading={actingId === report.id}
                    disabled={actingId !== null}
                    onClick={() => void start(report)}
                  >
                    Mulai ditangani
                  </Button>
                )}
                {report.status === "IN_PROGRESS" && (
                  <Button
                    type="button"
                    className={BUTTON_ACTION_CLASS}
                    disabled={actingId !== null}
                    onClick={() => openFinalize(report, "resolve")}
                  >
                    Tandai selesai
                  </Button>
                )}
                {(report.status === "NEW" || report.status === "IN_PROGRESS") && (
                  <Button
                    type="button"
                    variant="danger-soft"
                    className={BUTTON_ACTION_CLASS}
                    disabled={actingId !== null}
                    onClick={() => openFinalize(report, "reject")}
                  >
                    Tolak laporan
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {!loading && state.data && totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            className={BUTTON_ACTION_CLASS}
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Sebelumnya
          </Button>
          <p className="text-sm text-muted-foreground tabular-nums" aria-live="polite">
            Halaman {state.data.meta.page} dari {totalPages}
          </p>
          <Button
            type="button"
            variant="outline"
            className={BUTTON_ACTION_CLASS}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Berikutnya
          </Button>
        </div>
      )}

      <dialog
        ref={dialogRef}
        aria-label={finalize?.tujuan === "reject" ? "Tolak laporan" : "Selesaikan laporan"}
        onClose={() => {
          setFinalize(null);
          setCatatan("");
        }}
        className="w-full max-w-md rounded-card border border-border bg-card p-0 text-foreground backdrop:bg-black/50"
      >
        <form
          method="dialog"
          className="flex flex-col gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submitFinalize();
          }}
        >
          <div>
            <h2 className="font-heading text-lg font-semibold">
              {finalize?.tujuan === "reject" ? "Tolak laporan" : "Tandai laporan selesai"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Catatan penyelesaian wajib diisi dan akan terlihat oleh pelapor.
            </p>
          </div>
          <Field>
            <FieldLabel htmlFor="catatan-resolusi">Catatan penyelesaian</FieldLabel>
            <textarea
              id="catatan-resolusi"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              maxLength={MAKS_CATATAN_RESOLUSI_LAPORAN}
              rows={3}
              required
              placeholder="Contoh: Lampu diganti dan diuji"
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <FieldDescription>
              {catatan.length}/{MAKS_CATATAN_RESOLUSI_LAPORAN} karakter.
            </FieldDescription>
          </Field>
          <div className="flex gap-3">
            <Button
              type="submit"
              variant={finalize?.tujuan === "reject" ? "danger" : undefined}
              className={BUTTON_ACTION_CLASS}
              loading={actingId !== null}
              disabled={!catatan.trim() || actingId !== null}
            >
              {finalize?.tujuan === "reject" ? "Tolak laporan" : "Tandai selesai"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={BUTTON_ACTION_CLASS}
              disabled={actingId !== null}
              onClick={closeFinalize}
            >
              Batal
            </Button>
          </div>
        </form>
      </dialog>
    </section>
  );
}