import Image from "next/image"

import { cn } from "@/lib/utils"

interface HeroVisualProps {
  className?: string
}

function SkeletonLine({ className }: { className?: string }) {
  return <span className={cn("block rounded-full bg-border/80", className)} />
}

const sidebarItems = ["Ringkasan", "Fasilitas", "Reservasi Saya", "Laporan Saya"] as const

function DashboardMockup() {
  return (
    <div className="flex h-full">
      <aside className="w-[29%] shrink-0 border-r border-border bg-muted/70 p-[5%] max-sm:w-[44%] sm:max-xl:min-w-36.25">
        <p className="mb-[18%] max-sm:mb-[12%] sm:max-xl:mb-[12%] text-mockup-wordmark font-semibold tracking-tight">
          ruvana
        </p>
        <ul className="space-y-[7%] max-sm:space-y-[4%] sm:max-xl:space-y-[4%]">
          {sidebarItems.map((item, index) => (
            <li
              key={item}
              className={`${cn(
                "flex items-center gap-[7%] rounded-md px-[7%] py-[6%] whitespace-nowrap text-muted-foreground max-sm:gap-[3%] max-sm:px-[3%] max-sm:py-[4%] sm:max-xl:gap-[3%] sm:max-xl:px-[3%] sm:max-xl:py-[4%]",
                index === 0 && "bg-primary-subdued text-primary-subdued-foreground",
              )} text-mockup-nav`}
            >
              <span aria-hidden="true" className="block size-[0.45em] rounded-full bg-current" />
              {item}
            </li>
          ))}
        </ul>
      </aside>

      <div className="min-w-0 flex-1 p-[5%]" aria-hidden="true">
        <div className="mb-[7%] flex items-center justify-between">
          <div className="w-[48%] space-y-2">
            <SkeletonLine className="h-2 w-[45%]" />
            <SkeletonLine className="h-3 w-full bg-foreground/15" />
          </div>
          <span className="block aspect-square w-[9%] rounded-full bg-muted" />
        </div>

        <div className="mb-[7%] grid grid-cols-2 gap-[4%]">
          <span className="block aspect-2/1 rounded-control border border-border bg-muted/75" />
          <span className="block aspect-2/1 rounded-control border border-border bg-muted/75" />
        </div>

        <div className="space-y-[4%] border-t border-border pt-[6%]">
          <SkeletonLine className="h-2 w-[38%] bg-foreground/15" />
          <SkeletonLine className="h-1.5 w-full" />
          <SkeletonLine className="h-1.5 w-[82%]" />
        </div>
      </div>
    </div>
  )
}

export function HeroVisual({ className }: HeroVisualProps) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-3/2 w-full max-w-hero",
        "max-md:mt-10 max-md:max-w-wide",
        className,
      )}
    >
      <figure
        data-mockup-card="fasilitas"
        className="absolute top-[3%] right-[2%] z-1 aspect-video w-[84%] rotate-[8deg] overflow-hidden rounded-card border border-border bg-card shadow-subtle"
      >
        <Image
          src="/ruvana-lab2.jpg"
          alt="Peralatan laboratorium di atas meja kerja"
          fill
          priority
          sizes="(max-width: 767px) 82vw, (max-width: 1256px) 42vw, 560px"
          className="scale-[1.08] object-cover blur-soft filter-[saturate(.82)_contrast(.92)]"
        />
        <figcaption className="absolute top-[7%] left-[4%] rounded-control border border-border/80 bg-card/90 px-[4%] py-[2%] text-mockup-badge font-medium backdrop-blur-sm">
          Laboratorium
        </figcaption>
      </figure>

      <article
        aria-label="Mockup dashboard Ruvana"
        data-mockup-card="dashboard"
        className="absolute bottom-[2%] left-[2%] z-2 aspect-video w-[84%] max-md:w-[92%] rotate-[-0.8deg] overflow-hidden rounded-card border border-border bg-card shadow-subtle"
      >
        <DashboardMockup />
      </article>
    </div>
  )
}
