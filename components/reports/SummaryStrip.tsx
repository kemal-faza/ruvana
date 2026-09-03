import type { ReactNode } from "react";
import type { StatusLaporan } from "./types";

type FilterKey = "semua" | StatusLaporan;

interface SummaryStripProps {
  total: number;
  counts: Record<FilterKey, number>;
  active: FilterKey;
  onSelect: (key: FilterKey) => void;
}

interface StatStyle {
  dot: string;
  text: string;
  activeBg: string;
}

const STATUS_ITEMS: { key: StatusLaporan; label: string; hint: string; style: StatStyle }[] = [
  {
    key: "baru",
    label: "Baru",
    hint: "menunggu",
    style: { dot: "bg-[#7C9A97]", text: "text-[#5A5754]", activeBg: "bg-[#7C9A97]/[0.07]" },
  },
  {
    key: "diproses",
    label: "Diproses",
    hint: "ditangani",
    style: { dot: "bg-[#C4953A]", text: "text-[#5A5754]", activeBg: "bg-[#C4953A]/[0.07]" },
  },
  {
    key: "selesai",
    label: "Selesai",
    hint: "tuntas",
    style: { dot: "bg-[#6B9E7C]", text: "text-[#5A5754]", activeBg: "bg-[#6B9E7C]/[0.07]" },
  },
];

export default function SummaryStrip({ total, counts, active, onSelect }: SummaryStripProps) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-black/[0.05] bg-white/60 backdrop-blur-[6px]">
      <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:gap-0">
        {/* Total - Hero */}
        <button
          type="button"
          onClick={() => onSelect("semua")}
          aria-pressed={active === "semua"}
          className={`group flex items-baseline gap-3 pr-0 transition-colors sm:pr-8 ${
            active === "semua" ? "" : "sm:border-r sm:border-black/[0.06]"
          }`}
        >
          <span className={`text-[36px] font-bold tracking-tight tabular-nums leading-none transition-colors ${
            active === "semua" ? "text-[#C4953A]" : "text-[#2C2A28]"
          }`}>
            {total}
          </span>
          <span className="flex flex-col text-left">
            <span className="text-[13px] font-semibold text-[#2C2A28]">Total</span>
            <span className="text-[11px] text-[#8C8780]">seluruh laporan</span>
          </span>
        </button>

        {/* Status Stats */}
        <div className="flex flex-1 items-center justify-around sm:justify-evenly">
          {STATUS_ITEMS.map((item, idx) => {
            const value = counts[item.key];
            const isActive = active === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelect(item.key)}
                aria-pressed={isActive}
                className={`flex items-center gap-2.5 rounded-[8px] px-3 py-2 transition-colors sm:px-4 ${
                  isActive ? item.style.activeBg : "hover:bg-black/[0.02]"
                } ${idx < STATUS_ITEMS.length - 1 ? "" : ""}`}
              >
                <span className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                  isActive ? `bg-white/80 shadow-[0_1px_3px_rgba(0,0,0,0.06)]` : "bg-black/[0.03]"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${item.style.dot}`} />
                </span>
                <span className="text-left">
                  <span className={`block text-[20px] font-bold tabular-nums leading-tight transition-colors ${
                    isActive ? "text-[#2C2A28]" : item.style.text
                  }`}>
                    {value}
                  </span>
                  <span className="block text-[11px] text-[#8C8780]">{item.label}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
