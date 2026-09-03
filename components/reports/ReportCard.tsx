import type { ReactNode } from "react";
import type { Report } from "./types";
import StatusBadge from "./StatusBadge";
import FacilityThumb from "./FacilityThumb";

const TIPE_LABEL: Record<string, string> = {
  ruang_kelas: "Ruang Kelas",
  aula: "Aula",
  laboratorium: "Laboratorium",
  alat: "Alat",
  lapangan: "Lapangan",
};

export function formatWaktu(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

interface ReportCardProps {
  report: Report;
  facilityTipe: string;
  onClick: () => void;
}

export default function ReportCard({ report, facilityTipe, onClick }: ReportCardProps) {
  const tipe = TIPE_LABEL[facilityTipe] ?? facilityTipe;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-stretch gap-0 bg-transparent text-left transition-colors duration-150 hover:bg-black/[0.015] focus:outline-none focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C4953A]/50"
      aria-label={`Lihat detail laporan ${report.facilityName}`}
    >
      {/* Image — visual anchor */}
      <div className="relative hidden w-[180px] shrink-0 self-stretch overflow-hidden sm:block">
        <div className="absolute inset-2 overflow-hidden rounded-[10px]">
          {report.foto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={report.foto}
              alt=""
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="h-full w-full">
              <FacilityThumb tipe={facilityTipe} className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={report.status} />
          <span className="inline-flex items-center rounded-[6px] bg-black/[0.035] px-2 py-0.5 text-[11px] font-medium text-[#8C8780]">
            {report.kategori}
          </span>
          <span className="inline-flex items-center rounded-[6px] bg-black/[0.035] px-2 py-0.5 text-[11px] font-medium text-[#B0AAA2] sm:hidden">
            {tipe}
          </span>
        </div>
        <h3 className="truncate text-[15px] font-semibold text-[#2C2A28]">{report.facilityName}</h3>
        <p className="line-clamp-2 text-[13px] leading-relaxed text-[#8C8780]">{report.deskripsi}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#B0AAA2]">
          <span className="inline-flex items-center gap-1">
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5z" clipRule="evenodd" />
            </svg>
            {formatWaktu(report.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003z" />
            </svg>
            {report.userName}
          </span>
        </div>
      </div>

      {/* Arrow */}
      <div
        className="hidden shrink-0 self-center px-4 text-[#D4CFC8] transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-[#C4953A] sm:block"
        aria-hidden
      >
        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02z" clipRule="evenodd" />
        </svg>
      </div>
    </button>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[14px] border border-dashed border-black/[0.08] bg-white/40 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/[0.04] text-[#8C8780]">
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <p className="text-[13px] font-semibold text-[#5A5754]">{title}</p>
        <p className="mt-1 text-[13px] text-[#8C8780]">{description}</p>
      </div>
      {action}
    </div>
  );
}
