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

const DOTS: Record<string, string> = {
  semua: "#405E5C",
  baru: "#6F8987",
  diproses: "#D1A438",
  selesai: "#3E7C6B",
  ditolak: "#C2727A",
};

export default function FilterTabs({ active, onChange, counts }: FilterTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Filter status laporan"
      className="grid w-full grid-cols-2 gap-1 rounded-lg border border-[#405E5C]/15 bg-[#FAFCFB] p-1 shadow-sm sm:grid-cols-3 md:grid-cols-5"
    >
      {FILTER_OPTIONS.map((opt) => {
        const isActive = active === opt.key;
        return (
          <button
            key={opt.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(opt.key)}
            className={`relative flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D1A438] focus-visible:ring-offset-1 ${
              isActive
                ? "bg-[#D1A438]/12 text-[#263B3A]"
                : "text-[#6D8080] hover:bg-[#E5EFF0] hover:text-[#405E5C]"
            }`}
          >
            <span
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full transition-colors ${
                isActive ? "" : "bg-[#C7D3D3]"
              }`}
              style={isActive ? { backgroundColor: DOTS[opt.key] } : undefined}
            />
            <span>{opt.label}</span>
            {counts[opt.key] > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] leading-none tabular-nums ${
                  isActive ? "bg-[#FAFCFB]/80 text-[#405E5C]" : "bg-[#E5EFF0] text-[#6D8080]"
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
