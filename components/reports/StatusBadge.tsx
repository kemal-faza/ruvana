import type { StatusLaporan } from "./types";

const STATUS_STYLES: Record<StatusLaporan, { label: string; badge: string; dot: string }> = {
  baru: {
    label: "Baru",
    badge: "bg-[#6F8987]/12 text-[#405E5C] ring-[#6F8987]/30",
    dot: "bg-[#6F8987]",
  },
  diproses: {
    label: "Diproses",
    badge: "bg-[#D1A438]/12 text-[#8A6D1F] ring-[#D1A438]/30",
    dot: "bg-[#D1A438]",
  },
  selesai: {
    label: "Selesai",
    badge: "bg-[#3E7C6B]/12 text-[#3E7C6B] ring-[#3E7C6B]/25",
    dot: "bg-[#3E7C6B]",
  },
  ditolak: {
    label: "Ditolak",
    badge: "bg-[#C2727A]/12 text-[#A04A52] ring-[#C2727A]/30",
    dot: "bg-[#C2727A]",
  },
};

export default function StatusBadge({ status }: { status: StatusLaporan }) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${s.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
