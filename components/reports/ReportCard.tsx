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
      className="group flex w-full items-stretch gap-4 overflow-hidden rounded-lg border border-[#405E5C]/15 bg-[#FAFCFB] p-3 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#405E5C]/40 hover:bg-white hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D1A438]"
      aria-label={`Lihat detail laporan ${report.facilityName}`}
    >
      <div className="relative hidden w-40 shrink-0 overflow-hidden self-stretch rounded-md sm:block">
        {report.foto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={report.foto}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0">
            <FacilityThumb tipe={facilityTipe} className="h-full w-full transition-transform duration-300 group-hover:scale-105" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded bg-[#263B3A]/70 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur-sm">
          {tipe}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5 py-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={report.status} />
          <span className="inline-flex items-center rounded-md bg-[#E5EFF0] px-1.5 py-0.5 text-[11px] font-medium text-[#6D8080]">
            {report.kategori}
          </span>
        </div>
        <h3 className="truncate text-[15px] font-semibold text-[#263B3A]">{report.facilityName}</h3>
        <p className="line-clamp-2 text-sm leading-snug text-[#6D8080]">{report.deskripsi}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#9AAEAD]">
          <span className="inline-flex items-center gap-1">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5z" clipRule="evenodd" />
            </svg>
            {formatWaktu(report.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003z" />
            </svg>
            {report.userName}
          </span>
        </div>
      </div>

      <div
        className="hidden shrink-0 self-center text-[#C7D3D3] transition-all group-hover:translate-x-0.5 group-hover:text-[#B8942E] sm:block"
        aria-hidden
      >
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[#405E5C]/25 bg-[#FAFCFB]/80 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#405E5C]/10 text-[#405E5C]">
        <svg className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-[#263B3A]">{title}</p>
        <p className="mt-1 text-sm text-[#6D8080]">{description}</p>
      </div>
      {action}
    </div>
  );
}
