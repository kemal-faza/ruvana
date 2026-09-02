"use client";

import { useState } from "react";

interface ThumbMeta {
  url: string;
  alt: string;
  fallback: string;
}

const TYPES: Record<string, ThumbMeta> = {
  ruang_kelas: {
    url: "https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=70",
    alt: "Ruang kelas kampus",
    fallback: "from-[#405E5C] via-[#6F8987] to-[#405E5C]",
  },
  aula: {
    url: "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=600&q=70",
    alt: "Aula / auditorium kampus",
    fallback: "from-[#405E5C] via-[#8A6D1F] to-[#6F8987]",
  },
  laboratorium: {
    url: "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&w=600&q=70",
    alt: "Laboratorium komputer",
    fallback: "from-[#2F4A48] via-[#405E5C] to-[#6F8987]",
  },
  alat: {
    url: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=600&q=70",
    alt: "Alat / perlengkapan",
    fallback: "from-[#8A6D1F] via-[#405E5C] to-[#263B3A]",
  },
  lapangan: {
    url: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=600&q=70",
    alt: "Lapangan basket",
    fallback: "from-[#263B3A] via-[#405E5C] to-[#3E7C6B]",
  },
};

const FALLBACK_ICON: Record<string, string> = {
  ruang_kelas: "M12 3v2.25A6.75 6.75 0 0 0 5.25 12H3v1.5h3v3.75a1.5 1.5 0 0 0 3 0V16.5h6v.75a1.5 1.5 0 0 0 3 0v-3.75h3V12h-2.25A6.75 6.75 0 0 0 12 5.25V3h1.5V1.5h-3V3z",
  aula: "M6 3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v1.5h1a1 1 0 1 1 0 2h-1v6.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V6.5H5a1 1 0 1 1 0-2h1V3zm-2 13a1 1 0 1 0 0 2h12a1 1 0 1 0 0-2H4z",
  laboratorium: "M7 2.5A2.5 2.5 0 0 1 9.5 5v3.28c0 .506-.154.999-.44 1.408L7.6 11.75a4.5 4.5 0 0 0 4.9 7A4.5 4.5 0 0 0 17 14.5l-1.4-2.06a2.5 2.5 0 0 1-.44-1.4V5A2.5 2.5 0 0 0 12.7 2.5H7zm2 0a.5.5 0 0 0 0 1h2V5h-1.5a.5.5 0 0 0 0 1H11v3h1V6h2.5a.5.5 0 0 0 0-1h-1V3.5h2a.5.5 0 0 0 0-1H9z",
  alat: "M12.832 3.554a1 1 0 0 0-.845.463.75.75 0 0 1-1.255-.822l.62-1.02a1 1 0 0 0-.947-1.53A6 6 0 0 0 5.9 5.29l-.638.44A4 4 0 0 0 4 9.92V13a1 1 0 0 0 .293.707l7 7A1 1 0 0 0 12 21h4a1 1 0 0 0 .707-.293l-2.5-2.5z",
  lapangan: "M3.75 2a.75.75 0 0 0-.75.75v14.5a.75.75 0 0 0 1.5 0V15h12v2.25a.75.75 0 0 0 1.5 0V2.75a.75.75 0 0 0-1.5 0V13.5h-12V2.75A.75.75 0 0 0 3.75 2z",
};

export default function FacilityThumb({
  tipe,
  className,
  iconClassName,
  showLabel,
}: {
  tipe: string;
  className: string;
  iconClassName?: string;
  showLabel?: boolean;
}) {
  const meta = TYPES[tipe] ?? TYPES.ruang_kelas;
  const [failed, setFailed] = useState(false);

  if (failed || !meta.url) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center gap-1 bg-gradient-to-br ${meta.fallback} ${className}`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className={iconClassName ?? "h-7 w-7 text-white/90"}>
          <path d={FALLBACK_ICON[tipe] ?? FALLBACK_ICON.ruang_kelas} />
        </svg>
        {showLabel && (
          <span className="px-2 text-[10px] font-semibold uppercase tracking-wide text-white/85">
            {tipe.replace(/_/g, " ")}
          </span>
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={meta.url}
      alt={meta.alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`${className} object-cover`}
    />
  );
}
