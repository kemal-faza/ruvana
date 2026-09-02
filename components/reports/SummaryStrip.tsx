import type { ReactNode } from "react";
import type { StatusLaporan } from "./types";

type FilterKey = "semua" | StatusLaporan;

interface SummaryStripProps {
  total: number;
  counts: Record<FilterKey, number>;
  active: FilterKey;
  onSelect: (key: FilterKey) => void;
}

interface ItemStyle {
  tint: string;
  value: string;
  activeRing: string;
}

const ITEMS: { key: FilterKey; label: string; hint: string }[] = [
  { key: "semua", label: "Total", hint: "seluruh laporan" },
  { key: "baru", label: "Baru", hint: "menunggu proses" },
  { key: "diproses", label: "Diproses", hint: "sedang ditangani" },
  { key: "selesai", label: "Selesai", hint: "telah dituntaskan" },
];

const STYLES: Record<string, ItemStyle> = {
  semua: { tint: "bg-[#405E5C]/8", value: "text-[#405E5C]", activeRing: "ring-[#405E5C]/40" },
  baru: { tint: "bg-[#6F8987]/12", value: "text-[#405E5C]", activeRing: "ring-[#6F8987]/40" },
  diproses: { tint: "bg-[#D1A438]/10", value: "text-[#8A6D1F]", activeRing: "ring-[#D1A438]/45" },
  selesai: { tint: "bg-[#3E7C6B]/10", value: "text-[#3E7C6B]", activeRing: "ring-[#3E7C6B]/40" },
};

const ICONS: Record<string, ReactNode> = {
  semua: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6zM10 18a3 3 0 0 1-3-3h6a3 3 0 0 1-3 3z" />
    </svg>
  ),
  baru: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm.75 5a.75.75 0 0 0-1.5 0v3.5a.75.75 0 0 0 .436.681l2.5 1.25a.75.75 0 0 0 .628-1.362L10.75 9.62V7z" clipRule="evenodd" />
    </svg>
  ),
  diproses: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM6.75 10.25a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75z" />
    </svg>
  ),
  selesai: (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  ),
};

export default function SummaryStrip({ total, counts, active, onSelect }: SummaryStripProps) {
  return (
    <section className="overflow-hidden rounded-lg border border-[#405E5C]/15 bg-[#FAFCFB] shadow-sm">
      <div className="flex items-baseline justify-between gap-4 px-5 pt-4">
        <h2 className="text-sm font-semibold text-[#263B3A]">Ringkasan Laporan</h2>
        <p className="text-xs text-[#6D8080]">
          {total} laporan tercatat · klik untuk memfilter
        </p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-4 sm:gap-3">
        {ITEMS.map((item) => {
          const value = item.key === "semua" ? total : counts[item.key];
          const s = STYLES[item.key];
          const isActive = active === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              aria-pressed={isActive}
              className={`group relative overflow-hidden rounded-lg p-3.5 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D1A438] ${
                isActive ? `ring-2 ${s.activeRing}` : "ring-1 ring-inset ring-[#405E5C]/10"
              } ${s.tint}`}
            >
              <span className="flex items-center justify-between">
                <span className={`text-2xl font-bold tabular-nums ${s.value}`}>{value}</span>
                <span className={`flex h-7 w-7 items-center justify-center rounded-md ${s.tint} ${s.value}`}>
                  {ICONS[item.key]}
                </span>
              </span>
              <span className="mt-1 block text-xs font-semibold text-[#263B3A]">{item.label}</span>
              <span className="block text-[11px] text-[#6D8080]">{item.hint}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
