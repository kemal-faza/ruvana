import type { StatusLaporan } from "./types";

export interface FilterOption {
  key: "semua" | StatusLaporan;
  label: string;
  count?: number;
}

export const FILTER_OPTIONS: FilterOption[] = [
  { key: "semua", label: "Semua" },
  { key: "baru", label: "Baru" },
  { key: "diproses", label: "Diproses" },
  { key: "selesai", label: "Selesai" },
  { key: "ditolak", label: "Ditolak" },
];

interface FilterTabsProps {
  active: "semua" | StatusLaporan;
  onChange: (key: "semua" | StatusLaporan) => void;
  counts: Record<"semua" | StatusLaporan, number>;
}

const DOT_COLORS: Record<string, string> = {
  semua: "#5A5754",
  baru: "#7C9A97",
  diproses: "#C4953A",
  selesai: "#6B9E7C",
  ditolak: "#B87070",
};

export default function FilterTabs({ active, onChange, counts }: FilterTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter status laporan"
      className="flex flex-wrap items-center gap-1"
    >
      {FILTER_OPTIONS.map((opt) => {
        const isActive = active === opt.key;
        return (
          <button
            key={opt.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.key)}
            className={`relative inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C4953A]/50 focus-visible:ring-offset-1 ${
              isActive
                ? "bg-[#2C2A28] text-white shadow-[0_1px_3px_rgba(0,0,0,0.12)]"
                : "text-[#8C8780] hover:bg-black/[0.035] hover:text-[#5A5754]"
            }`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                isActive ? "opacity-80" : ""
              }`}
              style={{ backgroundColor: isActive ? "rgba(255,255,255,0.7)" : DOT_COLORS[opt.key] }}
            />
            <span>{opt.label}</span>
            {counts[opt.key] > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none tabular-nums ${
                  isActive ? "bg-white/20 text-white/90" : "bg-black/[0.04] text-[#8C8780]"
                }`}
              >
                {counts[opt.key]}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
