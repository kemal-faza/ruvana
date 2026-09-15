import Link from "next/link"
import type { CSSProperties } from "react"
import { ArrowDown, ArrowRight, Building2, CalendarDays, Check, ClipboardCheck, DoorOpen, Leaf, Search, Wrench } from "lucide-react"
import { Parallax } from "@/components/motion/parallax"
import { Reveal } from "@/components/motion/reveal"
import { StaggerGroup, StaggerItem } from "@/components/motion/stagger-group"
import { ThemeToggle } from "@/components/theme-toggle"
import { buttonVariants } from "@/components/ui/button"

function staggerStyle(index: number) {
  return { "--stagger-index": index } as CSSProperties
}

const benefits = [
  { icon: Search, title: "Temukan tempat yang tepat", description: "Kenali fasilitas kampus dan lihat ketersediaannya sebelum merencanakan kegiatan." },
  { icon: CalendarDays, title: "Ajukan dengan lebih terarah", description: "Pilih fasilitas dan jadwal, ajukan reservasi, lalu pantau keputusan petugas." },
  { icon: Wrench, title: "Ikut merawat fasilitas", description: "Laporkan kerusakan beserta foto dan pantau perkembangan penanganannya." },
]
const steps = [
  { title: "Jelajahi fasilitas", description: "Lihat fasilitas dan ketersediaan jadwal tanpa perlu masuk." },
  { title: "Siapkan akunmu", description: "Daftar dan tunggu verifikasi admin sebelum masuk untuk mengajukan reservasi." },
  { title: "Ajukan dan pantau", description: "Pilih jadwal sesuai kebutuhan. Reservasi berlaku setelah disetujui petugas." },
]
const primaryLink = buttonVariants({ className: "min-h-12 gap-3 px-6 text-sm" })
const headerLink = buttonVariants({ className: "min-h-11 gap-2 px-4 text-sm" })

export default function Home() {
  return (
    <>
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-card focus:p-4">Lewati ke konten</a>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-4 sm:px-8">
          <Link href="/" aria-label="ruvana — Beranda" className="flex min-h-11 items-center text-xl font-semibold tracking-tight">ruvana</Link>
          <nav aria-label="Navigasi utama" className="order-3 flex w-full items-center justify-center gap-6 text-sm sm:order-none sm:w-auto">
            <Link href="/" aria-current="page" className="flex min-h-11 items-center font-medium text-primary">Beranda</Link>
            <Link href="/fasilitas" className="flex min-h-11 items-center hover:text-primary">Fasilitas</Link>
            <a href="#cara-kerja" className="flex min-h-11 items-center hover:text-primary">Cara kerja</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/fasilitas" className={headerLink}>Jelajahi Fasilitas<ArrowRight aria-hidden="true" /></Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="konten">
        <section aria-labelledby="hero-title" className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:gap-16 lg:py-28">
          <div className="min-w-0">
            <p className="motion-rise motion-rise-stagger mb-6 flex items-center gap-2 text-sm font-medium text-primary" style={staggerStyle(0)}><span className="h-px w-8 bg-primary" />Ruang untuk setiap rencana</p>
            <h1 id="hero-title" className="motion-rise motion-rise-stagger max-w-xl text-4xl leading-[1.15] font-semibold tracking-tight sm:text-5xl lg:text-6xl" style={staggerStyle(1)}>Kenali fasilitas kampus,<br /><span className="text-primary">rencanakan kegiatanmu.</span></h1>
            <p className="motion-rise motion-rise-stagger mt-6 max-w-lg text-base leading-8 text-muted-foreground" style={staggerStyle(2)}>Dari ruang belajar hingga tempat berkegiatan. Ruvana membantu kamu menemukan fasilitas, mengajukan reservasi, dan ikut menjaga fasilitas kampus dalam satu tempat.</p>
            <div className="motion-rise motion-rise-stagger mt-8 min-w-0 flex flex-wrap items-center gap-4" style={staggerStyle(3)}>
              <Link href="/fasilitas" className={primaryLink}>Jelajahi Fasilitas<ArrowRight aria-hidden="true" /></Link>
              <a href="#cara-kerja" className="inline-flex min-h-12 items-center gap-2 px-2 text-sm font-medium">Kenali cara kerjanya<ArrowDown className="size-4" aria-hidden="true" /></a>
            </div>
            <p className="motion-rise motion-rise-stagger mt-5 text-xs leading-6 text-muted-foreground" style={staggerStyle(4)}>Lihat fasilitas dan jadwal tanpa perlu masuk.</p>
          </div>
          <Parallax speed={0.3} axis="y" distance="sm" className="min-w-0">
            <figure className="motion-rise motion-rise-scale motion-rise-delayed relative rounded-3xl border border-border bg-primary-subdued p-5 sm:p-8">
              <div className="mb-6 flex items-center justify-between text-primary-subdued-foreground"><span className="flex items-center gap-2 text-sm font-medium"><Building2 className="size-4" aria-hidden="true" />Fasilitas kampus</span><span className="rounded-full border border-current px-3 py-1 text-xs">Ilustrasi</span></div>
              <div className="space-y-4">
              <div className="rounded-card border border-border bg-card p-5 text-card-foreground shadow-subtle sm:p-6">
                <div className="mb-5 flex h-36 items-center justify-center rounded-xl bg-muted" aria-hidden="true"><DoorOpen className="size-24 stroke-1 text-primary" /><div className="ml-5 grid grid-cols-2 gap-3"><span className="h-9 w-9 rounded-md border-2 border-primary/40" /><span className="h-9 w-9 rounded-md border-2 border-primary/40" /><span className="h-9 w-9 rounded-md border-2 border-primary/40" /><span className="h-9 w-9 rounded-md border-2 border-primary/40" /></div></div>
                <p className="text-xs text-muted-foreground">Ruang untuk bertukar ide</p>
                <p className="mt-1 text-xl font-semibold">Ruang kelas</p>
                <div className="my-5 border-t border-border" />
                <div className="flex items-center gap-2 text-sm font-medium"><CalendarDays className="size-4 text-primary" aria-hidden="true" />Kenali ketersediaan jadwal</div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs"><span className="rounded-control bg-success-subdued px-2 py-3 text-success-subdued-foreground">Tersedia</span><span className="rounded-control bg-muted px-2 py-3 text-muted-foreground">Terisi</span><span className="rounded-control bg-success-subdued px-2 py-3 text-success-subdued-foreground">Tersedia</span></div>
              </div>
              <div className="relative flex items-center gap-3 rounded-card border border-border bg-card p-4 text-card-foreground shadow-subtle sm:ml-10"><span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-subdued text-primary-subdued-foreground"><ClipboardCheck className="size-5" aria-hidden="true" /></span><div><p className="text-sm font-medium">Rencana lebih tertata</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Ajukan, lalu pantau status reservasimu.</p></div></div>
              </div>
              <figcaption className="mt-5 text-center text-xs leading-5 text-primary-subdued-foreground">Ilustrasi alur Ruvana, bukan ketersediaan aktual.</figcaption>
            </figure>
          </Parallax>
        </section>
        <section aria-labelledby="benefits-title" className="border-y border-border bg-card">
          <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
            <Parallax speed={-0.2} axis="y" distance="sm"><Reveal><div className="mb-10 max-w-2xl"><p className="mb-3 text-sm font-medium text-primary">Kenalan dengan Ruvana</p><h2 id="benefits-title" className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">Kegiatan terencana.<br />Fasilitas terjaga.</h2><p className="mt-4 leading-7 text-muted-foreground">Satu tempat untuk kebutuhan fasilitas kampus, dari mencari ruang hingga melaporkan hal yang perlu diperbaiki.</p></div></Reveal></Parallax>
            <StaggerGroup stagger="functional" className="grid gap-6 md:grid-cols-3">{benefits.map(({ icon: Icon, title, description }, index) => (
              <StaggerItem key={title} className="h-full">
                <article className="h-full rounded-card border border-border bg-background p-6 sm:p-8">
                  <div className="mb-8 flex items-center justify-between"><span className="flex size-12 items-center justify-center rounded-xl bg-primary-subdued text-primary-subdued-foreground"><Icon className="size-5" aria-hidden="true" /></span><span className="text-xs text-muted-foreground">0{index + 1}</span></div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
                </article>
              </StaggerItem>
            ))}</StaggerGroup>
          </div>
        </section>
        <section id="cara-kerja" aria-labelledby="steps-title" className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
          <Reveal><div><p className="mb-3 text-sm font-medium text-primary">Dari rencana menjadi kegiatan</p><h2 id="steps-title" className="text-3xl leading-tight font-semibold tracking-tight sm:text-4xl">Mulai dengan<br />langkah sederhana.</h2><p className="mt-5 max-w-md leading-7 text-muted-foreground">Sudah punya rencana? Cari fasilitas yang sesuai, lalu siapkan pengajuanmu.</p><p className="mt-6 flex items-start gap-2 text-sm leading-6 text-primary"><Check className="mt-1 size-4 shrink-0" aria-hidden="true" />Ketersediaan dapat dilihat oleh siapa saja.</p></div></Reveal>
          <Reveal delay={0.08}><StaggerGroup as="ol" stagger="functional" className="space-y-8">{steps.map(({ title, description }, index) => <StaggerItem key={title} as="li" className="flex gap-5"><span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-border bg-card text-sm font-medium text-primary">0{index + 1}</span><div className="border-b border-border pb-7"><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{description}</p></div></StaggerItem>)}</StaggerGroup></Reveal>
        </section>
        <section aria-labelledby="cta-title" className="mx-auto max-w-7xl px-5 pb-16 sm:px-8 sm:pb-24"><Reveal from="scale"><div className="relative overflow-hidden rounded-3xl bg-primary-subdued px-6 py-12 text-center text-primary-subdued-foreground sm:p-16"><div className="relative"><Leaf className="mx-auto mb-5 size-7" aria-hidden="true" /><h2 id="cta-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">Ada rencana di kampus?</h2><p className="mx-auto mt-4 max-w-lg text-sm leading-7">Temukan fasilitas yang cocok untuk langkah berikutnya.<br className="hidden sm:block" /> Mulai dari melihat pilihan yang tersedia.</p><Link href="/fasilitas" className={`${primaryLink} mt-7`}>Jelajahi Fasilitas<ArrowRight aria-hidden="true" /></Link></div></div></Reveal></section>
      </main>
      <footer className="border-t border-border"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 px-5 py-8 text-sm sm:flex-row sm:items-center sm:px-8"><Link href="/" className="inline-flex min-h-11 items-center text-lg font-semibold">ruvana</Link><p className="text-muted-foreground">Ruang bersama, tanggung jawab bersama.</p><a href="#konten" className="inline-flex min-h-11 items-center text-muted-foreground hover:text-primary">Kembali ke atas ↑</a></div></footer>
    </>
  )
}
