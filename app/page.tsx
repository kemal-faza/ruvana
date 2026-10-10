import { ArrowRight, CalendarDays, Wrench } from "lucide-react"
import Link from "next/link"
import type { CSSProperties } from "react"

import { FacilitySearch } from "@/components/landing/facility-search"
import { canShowFacilitySearch } from "@/components/landing/facility-search-visibility"
import { HeroVisual } from "@/components/landing/hero-visual"
import { Parallax } from "@/components/motion/parallax"
import { Reveal } from "@/components/motion/reveal"
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger-group"
import { SiteFooter } from "@/components/site/site-footer"
import { SiteHeader } from "@/components/site/site-header"
import { SkipToContentLink } from "@/components/site/skip-to-content-link"
import { CookieConsentBanner } from "@/components/site/cookie-consent-banner"
import { buttonVariants } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { getSessionUser } from "@/lib/auth"
import { getPostLoginPath } from "@/lib/auth-routing"

const SHELL = "mx-auto w-full max-w-shell px-4 sm:px-7"
const primaryLink = buttonVariants({ className: "min-h-11 gap-2.5 px-4 text-sm" })
const quietLink = buttonVariants({
  variant: "ghost",
  className: "min-h-11 gap-2.5 px-4 text-sm text-muted-foreground",
})

function staggerStyle(index: number) {
  return { "--stagger-index": index } as CSSProperties
}

const benefits = [
  {
    icon: CalendarDays,
    title: "Ajukan reservasi",
    description:
      "Pilih fasilitas, waktu, dan tujuan kegiatan. Pengajuan memerlukan akun terverifikasi dan persetujuan petugas.",
  },
  {
    icon: Wrench,
    title: "Laporkan kerusakan",
    description: "Pilih fasilitas, jelaskan kerusakan, dan lampirkan satu foto.",
  },
]

const steps = [
  {
    title: "Pilih fasilitas",
    description: "Cari berdasarkan tipe dan tanggal kegiatan.",
  },
  {
    title: "Tentukan jadwal",
    description: "Pilih waktu dan isi tujuan reservasi.",
  },
  {
    title: "Pantau pengajuan",
    description: "Periksa status dan keputusan petugas di halaman Reservasi Saya.",
  },
]

export default async function Home() {
  // Sesi dibaca untuk menyembunyikan form pengajuan dari petugas/admin;
  // konsekuensinya rute ini dirender dinamis, bukan di-prerender statis.
  const user = await getSessionUser()
  return (
    <>
      <SkipToContentLink />

      <SiteHeader current="beranda" accountHomeHref={user ? getPostLoginPath(user.role) : undefined} />

      <main id="konten">
        <section aria-labelledby="hero-title" className={`${SHELL} pt-hero-top sm:pt-hero-top-lg`}>
          <div className="grid items-center gap-hero-gap md:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] md:gap-hero-gap-lg">
            <div className="min-w-0">
              <h1
                id="hero-title"
                className="motion-rise motion-rise-stagger mb-6 max-w-title text-display font-semibold tracking-display"
                style={staggerStyle(0)}
              >
                Cari ruang untuk kegiatan kampus.
              </h1>

              <p
                className="motion-rise motion-rise-stagger mb-8 max-w-lede text-lede text-muted-foreground sm:text-lede-lg"
                style={staggerStyle(1)}
              >
                Pilih fasilitas dan tanggal, lalu ajukan reservasi.
              </p>

              <div
                className="motion-rise motion-rise-stagger flex min-w-0 flex-wrap items-center gap-3.5 sm:gap-5"
                style={staggerStyle(2)}
              >
                <Link href="/fasilitas" className={primaryLink}>
                  Lihat fasilitas
                  <ArrowRight aria-hidden="true" data-motion-icon="inline-end" className="size-5" />
                </Link>
                <a href="#cara-kerja" className={quietLink}>
                  Lihat cara kerja
                  <ArrowRight aria-hidden="true" data-motion-icon="inline-end" className="size-5" />
                </a>
              </div>

            </div>

            <Parallax speed={0.2} axis="y" distance="sm" className="min-w-0">
              <HeroVisual />
            </Parallax>
          </div>
        </section>

        <FacilitySearch visible={canShowFacilitySearch(user?.role ?? null)} />

        <section aria-labelledby="benefits-title" className={`${SHELL} pt-section-top sm:pt-section-top-lg`}>
          <Reveal>
            <div className="mb-block sm:mb-block-lg">
              <h2
                id="benefits-title"
                className="max-w-heading text-display-md font-semibold tracking-heading"
              >
                Reservasi dan laporan fasilitas kampus
              </h2>
            </div>
          </Reveal>

          <StaggerGroup stagger="functional" className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            {benefits.map(({ icon: Icon, title, description }) => (
              <StaggerItem key={title} className="h-full">
                <Card className="relative h-full justify-end gap-3">
                  <Icon
                    aria-hidden="true"
                    strokeWidth={1.25}
                    className="pointer-events-none absolute -right-4 -bottom-5 size-32 text-brand-olive/10"
                  />
                  <div className="relative">
                    <h3 className="mb-2 text-body font-semibold tracking-title">{title}</h3>
                    <p className="max-w-copy text-copy text-muted-foreground">
                      {description}
                    </p>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </section>

        <section
          id="cara-kerja"
          aria-labelledby="steps-title"
          className={`${SHELL} pt-section-top sm:pt-section-top-lg`}
        >
          <Reveal>
            <div className="mb-block sm:mb-block-lg">
              <h2
                id="steps-title"
                className="max-w-heading text-display-md font-semibold tracking-heading"
              >
                Ajukan reservasi dalam tiga langkah
              </h2>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <StaggerGroup
              as="ol"
              stagger="functional"
              className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8"
            >
              {steps.map(({ title, description }, index) => (
                <StaggerItem key={title} as="li">
                  <article className="border-t border-border pt-block-xs">
                    <p className="text-caption font-semibold tracking-label text-brand-olive">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <div aria-hidden="true" className="my-6 h-px w-full bg-border" />
                    <h3 className="mb-2 text-lg font-semibold tracking-subtitle md:mt-block-lg max-md:mt-block-sm">
                      {title}
                    </h3>
                    <p className="max-w-step text-caption text-muted-foreground">{description}</p>
                  </article>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </Reveal>
        </section>

        <section id="jadwal" aria-labelledby="closing-title" className={`${SHELL} pt-section-top sm:pt-section-top-lg`}>
          <Reveal from="scale">
            <div className="flex flex-col items-start gap-9 rounded-card border border-border bg-muted px-6 py-7 md:flex-row md:items-center md:justify-between md:gap-10 md:px-12 md:py-block-lg">
              <div className="max-w-wide">
                <h2
                  id="closing-title"
                  className="text-display-sm font-semibold tracking-heading"
                >
                  Cari fasilitas sebelum mengajukan reservasi.
                </h2>
              </div>
              <Link href="/fasilitas" className={primaryLink}>
                Lihat fasilitas
                <ArrowRight aria-hidden="true" data-motion-icon="inline-end" className="size-5" />
              </Link>
            </div>
          </Reveal>
        </section>
      </main>

      <SiteFooter />
      <CookieConsentBanner />
    </>
  )
}
