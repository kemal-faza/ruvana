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
    <section className="rv-surface-frost overflow-hidden rounded-[14px]">
      <div className="flex items-center justify-between gap-3 px-5 py-3.5">
        <h2 className="text-[13px] font-semibold text-[#2C2A28]">Aktivitas Terbaru</h2>
        <span className="inline-flex items-center rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-medium text-[#8C8780] tabular-nums">
          {recent.length} laporan
        </span>
      </div>

      <ul>
        {recent.map((r, idx) => (
          <li
            key={r.id}
            className={`flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-black/[0.015] ${
              idx < recent.length - 1 ? "border-t border-black/[0.04]" : ""
            }`}
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-[#2C2A28]">{r.facilityName}</p>
              <p className="mt-0.5 text-[11px] text-[#B0AAA2]">{formatWaktu(r.createdAt)}</p>
            </div>
            <StatusBadge status={r.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
