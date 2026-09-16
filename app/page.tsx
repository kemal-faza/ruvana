import { CalendarDays, Wrench } from "lucide-react"
import Link from "next/link"
import type { CSSProperties } from "react"

import { FacilitySearch } from "@/components/landing/facility-search"
import { HeroVisual } from "@/components/landing/hero-visual"
import { Parallax } from "@/components/motion/parallax"
import { Reveal } from "@/components/motion/reveal"
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger-group"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { buttonVariants } from "@/components/ui/button"

const SHELL = "mx-auto w-full max-w-[1256px] px-4 sm:px-7"
const primaryLink = buttonVariants({ className: "min-h-11 gap-2.5 px-4 text-sm" })

function staggerStyle(index: number) {
  return { "--stagger-index": index } as CSSProperties
}

const benefits = [
  {
    icon: CalendarDays,
    title: "Reservasi lebih terarah",
    description:
      "Lihat fasilitas dan jadwalnya, ajukan kebutuhanmu, lalu pantau persetujuan petugas.",
  },
  {
    icon: Wrench,
    title: "Laporkan kerusakan",
    description:
      "Sampaikan kendala pada fasilitas agar petugas dapat menanganinya dengan lebih cepat.",
  },
]

const steps = [
  {
    title: "Temukan tempat yang tepat",
    description: "Kenali fasilitas kampus dan lihat ketersediaannya.",
  },
  {
    title: "Ajukan dengan lebih terarah",
    description: "Pilih fasilitas dan jadwal, lalu pantau persetujuan.",
  },
  {
    title: "Ikut merawat fasilitas",
    description: "Laporkan kendala agar ruang tetap nyaman digunakan.",
  },
]

export default function Home() {
  return (
    <>
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-card focus:p-4"
      >
        Lewati ke konten utama
      </a>

      <SiteHeader current="beranda" />

      <main id="konten">
        <section aria-labelledby="hero-title" className={`${SHELL} pt-[62px] sm:pt-[94px]`}>
          <div className="grid items-center gap-[38px] min-[701px]:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] min-[701px]:gap-[50px]">
            <div className="min-w-0">
              <p
                className="motion-rise motion-rise-stagger mb-5 flex items-center gap-3 text-xs font-semibold tracking-[0.08em] text-brand-olive uppercase"
                style={staggerStyle(0)}
              >
                Ruang kampus, lebih terarah
                <span aria-hidden="true" className="h-px w-[34px] bg-brand-olive" />
              </p>

              <h1
                id="hero-title"
                className="motion-rise motion-rise-stagger mb-6 max-w-[520px] text-[clamp(40px,4.4vw,58px)] leading-[1.08] font-semibold tracking-[-0.055em]"
                style={staggerStyle(1)}
              >
                Setiap kegiatan punya ruangnya.
              </h1>

              <p
                className="motion-rise motion-rise-stagger mb-8 max-w-[480px] text-[15px] leading-[1.7] text-muted-foreground sm:text-[17px] sm:leading-[1.75]"
                style={staggerStyle(2)}
              >
                Temukan fasilitas kampus, pilih jadwal yang sesuai, lalu ajukan reservasi dari
                satu tempat.
              </p>

              <div
                className="motion-rise motion-rise-stagger flex min-w-0 flex-wrap items-center gap-3.5 sm:gap-5"
                style={staggerStyle(3)}
              >
                <Link href="/fasilitas" className={primaryLink}>
                  Jelajahi Fasilitas
                  <span aria-hidden="true" className="text-[17px] leading-none">
                    ↗
                  </span>
                </Link>
                <a
                  href="#cara-kerja"
                  className="inline-flex items-center gap-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Lihat cara kerja
                  <span aria-hidden="true">→</span>
                </a>
              </div>

              <p
                className="motion-rise motion-rise-stagger mt-[34px] flex items-center gap-2.5 text-xs text-muted-foreground sm:mt-[52px]"
                style={staggerStyle(4)}
              >
                <span aria-hidden="true" className="size-[7px] rounded-full bg-accent-gold" />
                Akun terverifikasi, persetujuan petugas
              </p>
            </div>

            <Parallax speed={0.2} axis="y" distance="sm" className="min-w-0">
              <HeroVisual />
            </Parallax>
          </div>
        </section>

        <FacilitySearch />

        <section aria-labelledby="benefits-title" className={`${SHELL} pt-[92px] sm:pt-32`}>
          <Reveal>
            <div className="mb-[30px] flex flex-col gap-3 min-[701px]:flex-row min-[701px]:items-end min-[701px]:justify-between min-[701px]:gap-[30px] sm:mb-[42px]">
              <h2
                id="benefits-title"
                className="max-w-[600px] text-[clamp(27px,3.5vw,44px)] leading-[1.15] font-semibold tracking-[-0.05em]"
              >
                Satu tempat untuk reservasi dan kepedulian.
              </h2>
              <p className="max-w-[370px] text-sm text-muted-foreground">
                Ruvana membantu kegiatan berjalan teratur sekaligus menjaga fasilitas tetap
                nyaman dipakai bersama.
              </p>
            </div>
          </Reveal>

          <StaggerGroup stagger="functional" className="grid grid-cols-1 gap-0 min-[701px]:grid-cols-2 min-[701px]:gap-6">
            {benefits.map(({ icon: Icon, title, description }) => (
              <StaggerItem key={title} className="h-full">
                <article className="grid grid-cols-[48px_1fr] gap-5 border-t border-border py-[22px] min-[701px]:py-[26px]">
                  <span className="grid size-11 place-items-center rounded-[13px] border border-border bg-card text-brand-olive">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="mb-2 text-[17px] font-semibold tracking-[-0.03em]">{title}</h3>
                    <p className="max-w-[390px] text-[13px] leading-[1.65] text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </article>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        <section
          id="cara-kerja"
          aria-labelledby="steps-title"
          className={`${SHELL} pt-[92px] sm:pt-32`}
        >
          <Reveal>
            <div className="mb-[30px] flex flex-col gap-3 min-[701px]:flex-row min-[701px]:items-end min-[701px]:justify-between min-[701px]:gap-[30px] sm:mb-[42px]">
              <h2
                id="steps-title"
                className="max-w-[600px] text-[clamp(27px,3.5vw,44px)] leading-[1.15] font-semibold tracking-[-0.05em]"
              >
                Dari rencana, jadi kegiatan.
              </h2>
              <p className="max-w-[370px] text-sm text-muted-foreground">
                Alur yang sederhana untuk menemukan ruang dan ikut menjaganya.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <StaggerGroup
              as="ol"
              stagger="functional"
              className="grid grid-cols-1 gap-6 min-[701px]:grid-cols-3 min-[701px]:gap-8"
            >
              {steps.map(({ title, description }, index) => (
                <StaggerItem key={title} as="li">
                  <article className="border-t border-border pt-[18px]">
                    <p className="text-[13px] font-semibold tracking-[0.06em] text-brand-olive">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <div aria-hidden="true" className="my-6 h-px w-full bg-border" />
                    <h3 className="mb-2 text-lg font-semibold tracking-[-0.035em] min-[701px]:mt-[42px] max-[700px]:mt-[25px]">
                      {title}
                    </h3>
                    <p className="max-w-[250px] text-[13px] text-muted-foreground">{description}</p>
                  </article>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </Reveal>
        </section>

        <section id="jadwal" aria-labelledby="closing-title" className={`${SHELL} pt-[92px] sm:pt-32`}>
          <Reveal from="scale">
            <div className="flex flex-col items-start justify-between gap-9 rounded-card border border-border bg-muted px-6 py-7 min-[701px]:flex-row min-[701px]:items-center min-[701px]:px-12 min-[701px]:py-[42px]">
              <div className="max-w-[420px]">
                <h2
                  id="closing-title"
                  className="mb-2 max-w-[600px] text-[clamp(25px,3.2vw,40px)] leading-[1.17] font-semibold tracking-[-0.05em]"
                >
                  Mulai dari ruang yang tepat.
                </h2>
                <p className="mb-[18px] text-[13px] text-muted-foreground">
                  Lihat fasilitas kampus dan siapkan kegiatanmu.
                </p>
                <Link href="/fasilitas" className={primaryLink}>
                  Jelajahi Fasilitas
                  <span aria-hidden="true" className="text-[17px] leading-none">
                    ↗
                  </span>
                </Link>
              </div>
              <div
                aria-hidden="true"
                className="grid size-[130px] place-items-center rounded-full border border-border text-[42px] text-brand-olive"
              >
                ↗
              </div>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}
