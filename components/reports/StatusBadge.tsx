import type { StatusLaporan } from "./types";

const STATUS_STYLES: Record<StatusLaporan, { label: string; badge: string; dot: string }> = {
  baru: {
    label: "Baru",
    badge: "bg-[#7C9A97]/[0.08] text-[#5A5754]",
    dot: "bg-[#7C9A97]",
  },
  diproses: {
    label: "Diproses",
    badge: "bg-[#C4953A]/[0.08] text-[#8A6D1F]",
    dot: "bg-[#C4953A]",
  },
  selesai: {
    label: "Selesai",
    badge: "bg-[#6B9E7C]/[0.08] text-[#4A7A5C]",
    dot: "bg-[#6B9E7C]",
  },
  ditolak: {
    label: "Ditolak",
    badge: "bg-[#B87070]/[0.08] text-[#8E4F55]",
    dot: "bg-[#B87070]",
  },
};

export default function StatusBadge({ status }: { status: StatusLaporan }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[6px] px-2 py-0.5 text-[11px] font-medium ${s.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
