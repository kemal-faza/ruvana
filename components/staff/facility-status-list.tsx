"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, MapPin, Users } from "lucide-react";

import { BUTTON_ACTION_CLASS, Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FacilityStatusBadge } from "@/components/facilities/facility-status-badge";
import { formatWaktu } from "@/components/reports/format";
import { LABEL_TIPE_FASILITAS } from "@/config/labels";
import type { StatusFasilitasOperasional } from "@/config/business";
import type { FacilityStatusResult } from "@/lib/services/facility-status-service";
import type { StaffFacility } from "@/lib/services/facility-service";

/** Tombol status yang tersedia untuk tiap status (TRANSISI_STATUS_FASILITAS_OPERASIONAL). */
const LABEL_AKSI: Record<"ACTIVE" | "UNDER_MAINTENANCE", string> = {
  ACTIVE: "Tandai pemeliharaan",
  UNDER_MAINTENANCE: "Kembalikan tersedia",
};

type TujuanStatus = StatusFasilitasOperasional;

function tujuanStatus(facility: StaffFacility): TujuanStatus | null {
  if (facility.status === "ACTIVE") return "UNDER_MAINTENANCE";
  if (facility.status === "UNDER_MAINTENANCE") return "ACTIVE";
  return null;
}

/** Label aksi untuk status tujuan, dipakai kartu dan dialog. */
function labelTujuan(tujuan: TujuanStatus): string {
  return tujuan === "UNDER_MAINTENANCE" ? LABEL_AKSI.ACTIVE : LABEL_AKSI.UNDER_MAINTENANCE;
}

function provenance(facility: StaffFacility): string {
  if (!facility.statusChangedAt) return "Status belum pernah diubah.";
  const oleh = facility.statusChangedBy ? ` oleh ${facility.statusChangedBy.nama}` : "";
  return `Diubah${oleh} pada ${formatWaktu(facility.statusChangedAt)}.`;
}

/**
 * Status operasional fasilitas untuk petugas (REP-04). Dampak perubahan
 * ditampilkan sebelum konfirmasi, lalu perubahan dikirim ke
 * PATCH /api/staff/facilities/{id}/status yang menjalankan RES-09 dalam satu
 * transaksi; daftar publik di-revalidasi oleh route tersebut.
 */
export function FacilityStatusList({
  facilities,
  sorotFacilityId = null,
}: {
  facilities: StaffFacility[];
  // Deep-link dari antrean laporan (?facilityId=): sorot kartu yang cocok,
  // gulir ke posisinya, dan pindahkan fokus agar petugas langsung menemukan
  // tombol aksinya. Id tak dikenal diabaikan. Konfirmasi status tetap manual.
  sorotFacilityId?: number | null;
}) {
  const router = useRouter();
  const [items, setItems] = useState<StaffFacility[]>(facilities);
  const [actingId, setActingId] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);
  const [target, setTarget] = useState<{ facility: StaffFacility; tujuan: TujuanStatus } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const sorotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    sorotRef.current?.scrollIntoView?.({ block: "center" });
    sorotRef.current?.focus({ preventScroll: true });
  }, []);

  function openKonfirmasi(facility: StaffFacility) {
    const tujuan = tujuanStatus(facility);
    if (!tujuan) return;
    setTarget({ facility, tujuan });
    setNotice(null);
    dialogRef.current?.showModal();
  }

  function closeKonfirmasi() {
    dialogRef.current?.close();
    setTarget(null);
  }

  async function submit() {
    if (!target || actingId !== null) return;
    const { facility, tujuan } = target;
    setActingId(facility.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/staff/facilities/${facility.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ status: tujuan }),
      });
      const payload = (await res.json().catch(() => null)) as { detail?: string } | null;
      if (res.ok) {
        const updated = payload as FacilityStatusResult;
        setItems((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
        // FAC-04: UI yang melakukan mutasi me-refetch data server, sehingga daftar
        // petugas sinkron dengan provenance dan efek RES-09 yang baru disimpan.
        router.refresh();
        setNotice({
          ok: true,
          msg:
            tujuan === "UNDER_MAINTENANCE"
              ? `${updated.nama} ditandai dalam pemeliharaan. Reservasi yang sudah disetujui dan dimulai setelah waktu ini dibatalkan otomatis.`
              : `${updated.nama} kembali tersedia untuk reservasi.`,
        });
        closeKonfirmasi();
        return;
      }
      setNotice({ ok: false, msg: payload?.detail ?? "Gagal mengubah status fasilitas. Silakan coba lagi." });
      closeKonfirmasi();
    } catch {
      setNotice({ ok: false, msg: "Kesalahan jaringan. Silakan coba lagi." });
    } finally {
      setActingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Building2 aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Belum ada fasilitas</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      {notice && (
        <p
          aria-live="polite"
          className={`text-sm font-medium ${notice.ok ? "text-success-subdued-foreground" : "text-destructive"}`}
        >
          {notice.msg}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {items.map((facility) => {
          const tujuan = tujuanStatus(facility);
          const disorot = sorotFacilityId === facility.id;
          return (
            <div
              key={facility.id}
              ref={disorot ? sorotRef : undefined}
              tabIndex={disorot ? -1 : undefined}
              className={disorot ? "rounded-card ring-2 ring-warning ring-offset-2 ring-offset-background" : undefined}
            >
            <Card>
              <CardHeader>
                <CardTitle className="font-heading text-lg">
                  {facility.nama} · {LABEL_TIPE_FASILITAS[facility.tipe]}
                </CardTitle>
                <CardDescription>
                  <span className="inline-flex items-center gap-1">
                    <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
                    {facility.lokasi}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users aria-hidden="true" className="size-3.5 shrink-0" />
                    Kapasitas {facility.kapasitas} orang
                  </span>
                </CardDescription>
                <CardAction>
                  <FacilityStatusBadge status={facility.status} />
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
                {facility.deskripsi && <p>{facility.deskripsi}</p>}
                <p>{provenance(facility)}</p>
                {facility.status === "INACTIVE" && (
                  <p>Fasilitas nonaktif. Hanya admin yang dapat mengaktifkannya kembali.</p>
                )}
              </CardContent>
              {tujuan && (
                <div className="flex gap-3 px-6 pb-6">
                  <Button
                    type="button"
                    variant={tujuan === "UNDER_MAINTENANCE" ? "danger-soft" : "primary"}
                    className={BUTTON_ACTION_CLASS}
                    disabled={actingId !== null}
                    onClick={() => openKonfirmasi(facility)}
                  >
                    {labelTujuan(tujuan)}
                  </Button>
                </div>
              )}
            </Card>
            </div>
          );
        })}
      </div>

      <dialog
        ref={dialogRef}
        aria-label={target ? labelTujuan(target.tujuan) : "Ubah status fasilitas"}
        onClose={() => setTarget(null)}
        className="w-full max-w-md rounded-card border border-border bg-card p-0 text-foreground backdrop:bg-black/50"
      >
        <form
          method="dialog"
          className="flex flex-col gap-4 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div>
            <h2 className="font-heading text-lg font-semibold">
              {target
                ? target.tujuan === "UNDER_MAINTENANCE"
                  ? `Tandai ${target.facility.nama} dalam pemeliharaan`
                  : `Kembalikan ${target.facility.nama} tersedia`
                : "Ubah status fasilitas"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {target?.tujuan === "UNDER_MAINTENANCE"
                ? "Fasilitas berhenti menerima reservasi baru dan reservasi yang sudah disetujui akan dibatalkan otomatis."
                : "Fasilitas kembali menerima reservasi baru sesuai slot yang tersedia."}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              type="submit"
              variant={target?.tujuan === "UNDER_MAINTENANCE" ? "danger" : undefined}
              className={BUTTON_ACTION_CLASS}
              loading={actingId !== null}
              disabled={actingId !== null}
            >
              {target ? labelTujuan(target.tujuan) : "Simpan"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className={BUTTON_ACTION_CLASS}
              disabled={actingId !== null}
              onClick={closeKonfirmasi}
            >
              Batal
            </Button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
