import Image from "next/image"

import { cn } from "@/lib/utils"

interface HeroVisualProps {
  className?: string
}

const panels = [
  { label: "Reservasi", value: "02", status: "1 menunggu" },
  { label: "Laporan", value: "01", status: "ditangani" },
] as const

const agenda = [
  { time: "09.00", title: "Pengajuan ruang", status: "Menunggu", pending: true },
  { time: "13.30", title: "Ruang tersedia", status: "Siap", pending: false },
] as const

export function HeroVisual({ className }: HeroVisualProps) {
  return (
    <div
      aria-label="Pratinjau fasilitas dan ringkasan Ruvana"
      className={cn(
        "relative flex min-h-[466px] items-center justify-center pt-3.5 pr-[18px] pb-[26px]",
        "max-[900px]:min-h-[420px]",
        "max-[700px]:mt-[46px] max-[700px]:block max-[700px]:min-h-[460px] max-[700px]:pt-0 max-[700px]:pr-2 max-[700px]:pb-3",
        className,
      )}
    >
      <article
        className={cn(
          "relative z-[2] w-[min(100%,350px)] rotate-[-1.2deg] translate-x-2 translate-y-2.5 overflow-hidden",
          "rounded-card border border-border bg-card p-6 shadow-subtle",
          "max-[900px]:w-[58%] max-[900px]:min-w-[310px]",
          "max-[700px]:ml-[2%] max-[700px]:w-[88%] max-[700px]:min-w-0 max-[700px]:translate-x-0 max-[700px]:p-5",
        )}
      >
        <div className="mb-5 flex items-start justify-between border-b border-border pb-[19px]">
          <div>
            <p className="text-xs text-muted-foreground">Ringkasan aktivitas</p>
            <p className="text-[17px] font-semibold tracking-[-0.03em]">Ruvana untukmu</p>
          </div>
          <span
            aria-hidden="true"
            className="grid size-[30px] place-items-center rounded-full bg-muted text-xs font-semibold text-brand-olive"
          >
            RA
          </span>
        </div>

        <p className="mb-[17px] text-xs text-muted-foreground">
          Pantau pengajuan dan laporanmu dalam satu tampilan.
        </p>

        <div className="mb-5 grid grid-cols-2 gap-2.5 max-[420px]:gap-[7px]">
          {panels.map(({ label, value, status }) => (
            <div
              key={label}
              className="rounded-[14px] border border-border bg-muted p-3.5 max-[420px]:p-[11px]"
            >
              <span className="mb-[7px] block text-xs text-muted-foreground">{label}</span>
              <strong className="text-2xl leading-none font-semibold tracking-[-0.05em] max-[420px]:text-[21px]">
                {value}
              </strong>
              <span className="mt-2.5 flex items-center gap-[5px] text-xs text-brand-olive">
                <i aria-hidden="true" className="size-1.5 rounded-full bg-brand-olive" />
                {status}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t border-border pt-4">
          <div className="mb-2.5 flex items-center justify-between">
            <strong className="text-xs font-medium">Agenda terdekat</strong>
            <span className="text-xs text-muted-foreground">Minggu ini</span>
          </div>
          {agenda.map(({ time, title, status, pending }) => (
            <div
              key={time}
              className="flex items-center gap-2.5 border-b border-border py-2.5 text-xs last:border-b-0"
            >
              <time className="w-[42px] text-muted-foreground">{time}</time>
              <b className="flex-1 font-medium">{title}</b>
              <span
                className={cn(
                  "rounded-md px-1.5 py-1 text-xs",
                  pending
                    ? "bg-warning-subdued text-warning-subdued-foreground"
                    : "bg-success-subdued text-success-subdued-foreground",
                )}
              >
                {status}
              </span>
            </div>
          ))}
        </div>
      </article>

      <figure
        className={cn(
          "relative z-[1] mt-[58px] -ml-[18px] h-[380px] w-[min(100%,310px)] rotate-[1.1deg] overflow-hidden",
          "rounded-card border border-border bg-muted shadow-subtle",
          "max-[900px]:h-[340px] max-[900px]:w-[48%]",
          "max-[700px]:mt-[-18px] max-[700px]:ml-auto max-[700px]:h-80 max-[700px]:w-[82%]",
          "max-[420px]:h-[292px]",
        )}
      >
        <Image
          src="/ruvana-lab2.jpg"
          alt="Peralatan laboratorium di atas meja kerja"
          fill
          priority
          sizes="(max-width: 700px) 82vw, (max-width: 900px) 48vw, 310px"
          className="object-cover [filter:saturate(.88)_contrast(.96)]"
        />
        <figcaption className="absolute right-[18px] bottom-4 left-[18px] flex items-center justify-between gap-3 rounded-control border border-border/80 bg-card/90 px-3 py-2.5 text-xs text-foreground backdrop-blur-sm">
          <strong className="text-xs font-medium">Laboratorium</strong>
          <span>Fasilitas aktif ↗</span>
        </figcaption>
      </figure>

      <p className="absolute inset-x-0 -bottom-1 text-center text-xs text-muted-foreground">
        Ilustrasi tampilan Ruvana, bukan ketersediaan aktual.
      </p>
    </div>
  )
}
