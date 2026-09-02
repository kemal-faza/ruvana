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
  baru: { done: "bg-[#6F8987]", dot: "ring-[#6F8987]", label: "text-[#405E5C]" },
  diproses: { done: "bg-[#D1A438]", dot: "ring-[#D1A438]", label: "text-[#8A6D1F]" },
  selesai: { done: "bg-[#3E7C6B]", dot: "ring-[#3E7C6B]", label: "text-[#3E7C6B]" },
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
                  idx > 0 ? (reached(idx - 1) ? stepStyle.done : "bg-[#C7D3D3]") : "invisible"
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
                      : "border-[#C7D3D3] bg-white"
                  }`}
                >
                  {done ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143z" clipRule="evenodd" />
                    </svg>
                  ) : isCurrent ? (
                    <span className="h-2 w-2 rounded-full bg-current" />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-[#C7D3D3]" />
                  )}
                </span>
                <span
                  className={`mt-1.5 text-[11px] ${
                    isCurrent
                      ? `font-semibold ${stepStyle.label}`
                      : done
                      ? "font-medium text-[#405E5C]"
                      : "text-[#9AAEAD]"
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
                      : "bg-[#C7D3D3]"
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
    <div className="flex items-center justify-between gap-4 px-3.5 py-2.5 text-sm">
      <dt className="text-[#6D8080]">{label}</dt>
      <dd className="text-right font-medium text-[#263B3A]">{value}</dd>
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
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-rv-fade" onClick={onClose} />
      <div className="absolute inset-0 flex justify-end">
        <aside className="flex h-full w-full max-w-md flex-col overflow-hidden bg-[#FAFCFB] shadow-2xl animate-rv-slide-in-right sm:border-l sm:border-[#405E5C]/15">
          <header className="flex items-center justify-between border-b border-[#405E5C]/15 bg-white px-5 py-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6D8080]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D1A438]" aria-hidden />
              LP-#{String(report.id).padStart(4, "0")}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-[#6D8080] transition-colors hover:bg-[#E5EFF0] hover:text-[#405E5C] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D1A438]"
              aria-label="Tutup detail laporan"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="border-b border-[#405E5C]/10 bg-gradient-to-b from-[#E5EFF0]/60 to-[#FAFCFB] px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-[#263B3A]">{report.facilityName}</h3>
                  <p className="mt-0.5 text-xs text-[#6D8080]">
                    {facility ? `${report.kategori} · ${facility.lokasi}` : report.kategori}
                  </p>
                </div>
                <StatusBadge status={report.status} />
              </div>
            </div>

            <div className="px-5 pt-5">
              <div className="relative h-52 w-full overflow-hidden rounded-xl border border-[#405E5C]/15">
                {report.foto && !fotoFailed ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={report.foto}
                      alt={`Foto bukti ${report.facilityName}`}
                      onError={() => setFotoFailed(true)}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute left-2 top-2 rounded bg-[#263B3A]/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
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
                <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-[#6D8080]">
                  Progres Penanganan
                </h4>
                <Timeline status={report.status} />
              </section>

              <section>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6D8080]">
                  Deskripsi
                </h4>
                <p className="whitespace-pre-wrap rounded-lg border border-[#405E5C]/10 bg-[#E5EFF0]/50 px-3.5 py-3 text-sm leading-relaxed text-[#263B3A]">
                  {report.deskripsi}
                </p>
              </section>

              <section>
                <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6D8080]">
                  Informasi
                </h4>
                <dl className="divide-y divide-[#405E5C]/10 rounded-lg border border-[#405E5C]/15 bg-[#E5EFF0]/40">
                  <InfoRow label="Pelapor" value={report.userName} />
                  <InfoRow label="Ditangani oleh" value={report.ditanganiOleh ?? "Belum ditugaskan"} />
                  <InfoRow label="Diajukan" value={formatWaktu(report.createdAt)} />
                  <InfoRow label="Diperbarui" value={formatWaktu(report.updatedAt)} />
                </dl>
              </section>

              {report.catatanResolusi && (
                <section>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#6D8080]">
                    Catatan Penyelesaian
                  </h4>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800">
                    {report.catatanResolusi}
                  </div>
                </section>
              )}

              {report.status === "baru" && (
                <div className="rounded-lg border border-[#6F8987]/25 bg-[#6F8987]/10 px-4 py-3 text-sm text-[#405E5C]">
                  Laporan menunggu diproses petugas. Pembaruan status akan tampil di sini.
                </div>
              )}
              {report.status === "ditolak" && (
                <div className="rounded-lg border border-[#C2727A]/30 bg-[#C2727A]/10 px-4 py-3 text-sm text-[#A04A52]">
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
