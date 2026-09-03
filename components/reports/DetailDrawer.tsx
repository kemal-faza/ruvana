"use client";

import { useEffect, useState } from "react";
import type { Facility, Report } from "./types";
import StatusBadge from "./StatusBadge";
import { formatWaktu } from "./ReportCard";
import FacilityThumb from "./FacilityThumb";

interface DetailDrawerProps {
  report: Report;
  facility: Facility | undefined;
  open: boolean;
  onClose: () => void;
}

const STATUS_STEPS = ["baru", "diproses", "selesai"] as const;

const STEP_COLOR: Record<string, { done: string; dot: string; label: string }> = {
  baru: { done: "bg-[#7C9A97]", dot: "ring-[#7C9A97]", label: "text-[#5A5754]" },
  diproses: { done: "bg-[#C4953A]", dot: "ring-[#C4953A]", label: "text-[#8A6D1F]" },
  selesai: { done: "bg-[#6B9E7C]", dot: "ring-[#6B9E7C]", label: "text-[#6B9E7C]" },
};

function Timeline({ status }: { status: Report["status"] }) {
  const currentIndex =
    status === "ditolak" ? 1 : STATUS_STEPS.findIndex((s) => s === status);
  const reached = (idx: number) => {
    if (status === "ditolak") return idx < 2;
    return idx <= currentIndex;
  };

  const labels: Record<string, string> = {
    baru: "Diajukan",
    diproses: "Diproses",
    selesai: "Selesai",
  };

  return (
    <ol className="flex items-start">
      {STATUS_STEPS.map((step, idx) => {
        const stepStyle = STEP_COLOR[step];
        const done = reached(idx);
        const isCurrent = idx === currentIndex && status !== "selesai" && status !== "ditolak";
        return (
          <li key={step} className="flex flex-1 flex-col items-center last:flex-none">
            <div className="flex w-full items-center">
              <div
                className={`mb-5 h-0.5 flex-1 rounded transition-colors ${
                  idx > 0 ? (reached(idx - 1) ? stepStyle.done : "bg-black/[0.08]") : "invisible"
                }`}
                aria-hidden
              />
              <div className="flex flex-col items-center">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                    done
                      ? `${stepStyle.done} border-transparent text-white`
                      : isCurrent
                      ? `bg-white ${stepStyle.dot} border-transparent`
                      : "border-black/[0.10] bg-white"
                  }`}
                >
                  {done ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143z" clipRule="evenodd" />
                    </svg>
                  ) : isCurrent ? (
                    <span className="h-2 w-2 rounded-full bg-current" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-black/[0.08]" />
                  )}
                </span>
                <span
                  className={`mt-1.5 text-[11px] ${
                    isCurrent
                      ? `font-semibold ${stepStyle.label}`
                      : done
                      ? "font-medium text-[#5A5754]"
                      : "text-[#B0AAA2]"
                  }`}
                >
                  {labels[step]}
                </span>
              </div>
              <div
                className={`mb-5 h-0.5 flex-1 rounded transition-colors ${
                  idx < STATUS_STEPS.length - 1
                    ? done
                      ? stepStyle.done
                      : "bg-black/[0.08]"
                    : "invisible"
                }`}
                aria-hidden
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5 text-[13px]">
      <dt className="text-[#8C8780]">{label}</dt>
      <dd className="text-right font-medium text-[#2C2A28]">{value}</dd>
    </div>
  );
}

export default function DetailDrawer({ report, facility, open, onClose }: DetailDrawerProps) {
  const [fotoFailed, setFotoFailed] = useState(false);
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !report) return null;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Detail laporan">
      <div className="absolute inset-0 bg-[#2C2A28]/30 backdrop-blur-[2px] animate-rv-fade" onClick={onClose} />
      <div className="absolute inset-0 flex justify-end">
        <aside className="flex h-full w-full max-w-md flex-col overflow-hidden bg-[#F8F6F3] shadow-2xl animate-rv-slide-in-right sm:border-l sm:border-black/[0.06]">
          <header className="flex items-center justify-between border-b border-black/[0.06] bg-white/80 px-5 py-4 backdrop-blur-[8px]">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#8C8780]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C4953A]" aria-hidden />
              LP-#{String(report.id).padStart(4, "0")}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[8px] p-1.5 text-[#8C8780] transition-colors hover:bg-black/[0.04] hover:text-[#5A5754] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4953A]/50"
              aria-label="Tutup detail laporan"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="border-b border-black/[0.04] bg-gradient-to-b from-[#F0EDE8]/60 to-[#F8F6F3] px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[17px] font-semibold text-[#2C2A28]">{report.facilityName}</h3>
                  <p className="mt-0.5 text-[12px] text-[#8C8780]">
                    {facility ? `${report.kategori} · ${facility.lokasi}` : report.kategori}
                  </p>
                </div>
                <StatusBadge status={report.status} />
              </div>
            </div>

            <div className="px-5 pt-5">
              <div className="relative h-52 w-full overflow-hidden rounded-[12px] border border-black/[0.06]">
                {report.foto && !fotoFailed ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={report.foto}
                      alt={`Foto bukti ${report.facilityName}`}
                      onError={() => setFotoFailed(true)}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-2 top-2 rounded-[6px] bg-[#2C2A28]/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
                      Foto Bukti
                    </span>
                  </>
                ) : (
                  <FacilityThumb tipe={facility?.tipe ?? ""} className="h-full w-full" />
                )}
              </div>
            </div>

            <div className="space-y-6 px-5 py-5">
              <section>
                <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#8C8780]">
                  Progres Penanganan
                </h4>
                <Timeline status={report.status} />
              </section>

              <section>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8C8780]">
                  Deskripsi
                </h4>
                <p className="whitespace-pre-wrap rounded-[10px] border border-black/[0.04] bg-white/60 px-4 py-3 text-[13px] leading-relaxed text-[#2C2A28]">
                  {report.deskripsi}
                </p>
              </section>

              <section>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8C8780]">
                  Informasi
                </h4>
                <dl className="divide-y divide-black/[0.04] rounded-[10px] border border-black/[0.05] bg-white/60">
                  <InfoRow label="Pelapor" value={report.userName} />
                  <InfoRow label="Ditangani oleh" value={report.ditanganiOleh ?? "Belum ditugaskan"} />
                  <InfoRow label="Diajukan" value={formatWaktu(report.createdAt)} />
                  <InfoRow label="Diperbarui" value={formatWaktu(report.updatedAt)} />
                </dl>
              </section>

              {report.catatanResolusi && (
                <section>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#8C8780]">
                    Catatan Penyelesaian
                  </h4>
                  <div className="rounded-[10px] border border-[#6B9E7C]/15 bg-[#6B9E7C]/[0.05] px-4 py-3 text-[13px] text-[#4A7A5C]">
                    {report.catatanResolusi}
                  </div>
                </section>
              )}

              {report.status === "baru" && (
                <div className="rounded-[10px] border border-[#7C9A97]/15 bg-[#7C9A97]/[0.05] px-4 py-3 text-[13px] text-[#5A5754]">
                  Laporan menunggu diproses petugas. Pembaruan status akan tampil di sini.
                </div>
              )}
              {report.status === "ditolak" && (
                <div className="rounded-[10px] border border-[#B87070]/15 bg-[#B87070]/[0.05] px-4 py-3 text-[13px] text-[#8E4F55]">
                  {report.catatanResolusi ?? "Laporan ini ditolak oleh petugas."}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
