import type { Report } from "./types";
import StatusBadge from "./StatusBadge";
import { formatWaktu } from "./ReportCard";

interface RecentActivityProps {
  reports: Report[];
}

export default function RecentActivity({ reports }: RecentActivityProps) {
  const recent = [...reports]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  if (recent.length === 0) return null;

  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-[#405E5C]/15 bg-[#FAFCFB] shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-[#405E5C]/10 bg-[#E5EFF0]/50 px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#263B3A]">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#D1A438]/12 text-[#8A6D1F]">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5z" clipRule="evenodd" />
            </svg>
          </span>
          Aktivitas Terbaru
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full bg-[#D1A438]/12 px-2 py-0.5 text-[11px] font-semibold text-[#8A6D1F] ring-1 ring-inset ring-[#D1A438]/30">
          {recent.length} laporan
        </span>
      </div>

      <ul>
        {recent.map((r, idx) => (
          <li
            key={r.id}
            className={`flex items-center justify-between gap-3 bg-white px-4 py-3 ${
              idx < recent.length - 1 ? "border-b border-[#405E5C]/10" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[#263B3A]">{r.facilityName}</p>
              <p className="mt-0.5 text-xs text-[#6D8080]">{formatWaktu(r.createdAt)}</p>
            </div>
            <StatusBadge status={r.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
