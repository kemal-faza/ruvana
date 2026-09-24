import { CalendarDays, Inbox } from "lucide-react"

import { AppShell } from "@/components/app-shell/app-shell"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Button, buttonVariants } from "@/components/ui/button"
import { navigation, shellAccount } from "@/config/navigation"

const catalogLinks = [
  { href: "#aksi", label: "Button" },
  { href: "#form", label: "Field" },
  { href: "#permukaan", label: "Card" },
  { href: "#badge", label: "Badge" },
  { href: "#umpan-balik", label: "Skeleton" },
  { href: "#empty", label: "Empty state" },
  { href: "#overlay", label: "Tooltip dan panel" },
]
const LANDING_ACTION_CLASS = "min-h-11 gap-2.5 px-4 text-sm"

export default function Home() {
  return (
    <AppShell navigation={navigation} account={shellAccount}>
      <a
        href="#katalog"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-control focus:bg-card focus:px-4 focus:py-3 focus:shadow-subtle"
      >
        Lewati ke katalog komponen
      </a>

      <main
        id="katalog"
        className="mx-auto flex w-full max-w-shell min-w-0 flex-col gap-8 px-4 pt-8 pb-12 sm:gap-10 sm:px-7 sm:pt-12 sm:pb-16 lg:gap-12 lg:pt-section-top"
      >
        <header className="max-w-heading">
          <p className="mb-4 flex items-center gap-3 text-caption font-semibold tracking-eyebrow text-brand-olive uppercase">
            Pratinjau komponen
            <span aria-hidden="true" className="h-px w-eyebrow-rule bg-brand-olive" />
          </p>
          <h1 className="mb-4 text-display-md font-semibold tracking-heading">
            Baseline UI Ruvana
          </h1>
          <p className="text-lede text-muted-foreground sm:text-lede-lg">
            Kumpulan komponen yang dipakai lintas fitur, ditampilkan dengan warna, tipografi,
            dan ritme visual Ruvana.
          </p>
        </header>

        <nav aria-label="Navigasi katalog" className="flex flex-wrap gap-2">
          {catalogLinks.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="grid min-w-0 gap-8 lg:grid-cols-2 lg:gap-6">
          <section id="aksi" aria-labelledby="button-title" className="min-w-0 scroll-mt-6 space-y-4">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-label text-brand-olive">01 / AKSI</p>
              <h2 id="button-title" className="font-heading text-xl font-semibold tracking-subtitle sm:text-2xl">
                Button
              </h2>
            </div>
            <Card>
              <CardHeader className="p-0">
                <CardDescription>
                  Variasi tombol memakai state hover, focus-visible, tekan, loading, dan disabled yang
                  sama di seluruh fitur.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3 p-0">
                <Button className={LANDING_ACTION_CLASS}>Utama</Button>
                <Button variant="secondary" className={LANDING_ACTION_CLASS}>Sekunder</Button>
                <Button variant="outline" className={LANDING_ACTION_CLASS}>Outline</Button>
                <Button variant="ghost" className={LANDING_ACTION_CLASS}>Ghost</Button>
                <Button variant="danger" className={LANDING_ACTION_CLASS}>Destruktif</Button>
                <Button disabled className={LANDING_ACTION_CLASS}>Dinonaktifkan</Button>
                <Button loading className={LANDING_ACTION_CLASS}>Memuat</Button>
              </CardContent>
            </Card>
          </section>

          <section id="form" aria-labelledby="field-title" className="min-w-0 scroll-mt-6 space-y-4">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-label text-brand-olive">02 / INPUT</p>
              <h2 id="field-title" className="font-heading text-xl font-semibold tracking-subtitle sm:text-2xl">
                Field
              </h2>
            </div>
            <Card>
              <CardContent className="grid min-w-0 gap-6 p-0 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="contoh-nama" required>Nama contoh</FieldLabel>
                  <Input
                    id="contoh-nama"
                    aria-describedby="contoh-nama-help contoh-nama-error"
                    aria-invalid="true"
                    required
                    className="min-h-11"
                  />
                  <FieldDescription id="contoh-nama-help">
                    Label, bantuan, dan pesan kesalahan terhubung secara semantik.
                  </FieldDescription>
                  <FieldError id="contoh-nama-error">Contoh pesan kesalahan.</FieldError>
                </Field>

                <Field>
                  <FieldLabel htmlFor="contoh-catatan">Catatan</FieldLabel>
                  <Input
                    id="contoh-catatan"
                    aria-describedby="contoh-catatan-help"
                    placeholder="Tulis catatan"
                    className="min-h-11"
                  />
                  <FieldDescription id="contoh-catatan-help">
                    Contoh isian opsional dengan petunjuk singkat.
                  </FieldDescription>
                </Field>

                <Field>
                  <FieldLabel htmlFor="contoh-select">Pilihan</FieldLabel>
                  <Select name="pilihan-contoh" defaultValue="opsi-satu">
                    <SelectTrigger id="contoh-select" className="min-h-11 w-full">
                      <SelectValue placeholder="Pilih salah satu" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opsi-satu">Pilihan pertama</SelectItem>
                      <SelectItem value="opsi-dua">Pilihan kedua</SelectItem>
                      <SelectItem value="opsi-tiga">Pilihan ketiga</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Tanggal contoh</p>
                  <DatePicker
                    name="tanggal-contoh"
                    aria-label="Tanggal contoh"
                    placeholder="Pilih tanggal"
                    className="min-h-11 rounded-lg border border-input px-3 hover:bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Pemilih tanggal membuka kalender yang bisa digunakan dengan keyboard.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>

          <section id="permukaan" aria-labelledby="surface-title" className="min-w-0 scroll-mt-6 space-y-4">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-label text-brand-olive">03 / INFORMASI</p>
              <h2 id="surface-title" className="font-heading text-xl font-semibold tracking-subtitle sm:text-2xl">
                Card
              </h2>
            </div>
            <Card className="shadow-none hover:translate-y-0">
              <CardHeader>
                <CardTitle>Susunan kartu</CardTitle>
                <CardDescription>
                  Header, deskripsi, aksi, konten, dan footer mengikuti satu pola permukaan.
                </CardDescription>
                <CardAction><Badge variant="success">Siap</Badge></CardAction>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Ruang konten menjaga jarak baca tanpa dekorasi tambahan.
              </CardContent>
              <Separator />
              <CardFooter className="justify-between gap-3">
                <span className="text-sm text-muted-foreground">Informasi pendukung</span>
                <Button variant="outline" className={LANDING_ACTION_CLASS}>Lihat contoh</Button>
              </CardFooter>
            </Card>
          </section>

          <section id="badge" aria-labelledby="badge-title" className="min-w-0 scroll-mt-6 space-y-4">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-label text-brand-olive">04 / STATUS</p>
              <h2 id="badge-title" className="font-heading text-xl font-semibold tracking-subtitle sm:text-2xl">
                Badge
              </h2>
            </div>
            <Card>
              <CardContent className="flex flex-wrap gap-2 p-0">
                <Badge>Default</Badge>
                <Badge variant="pending">Menunggu</Badge>
                <Badge variant="success">Sukses</Badge>
                <Badge variant="danger">Perlu tindakan</Badge>
                <Badge variant="info">Informasi</Badge>
                <Badge variant="neutral">Netral</Badge>
              </CardContent>
            </Card>
          </section>

          <section id="umpan-balik" aria-labelledby="feedback-title" className="min-w-0 scroll-mt-6 space-y-4">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-label text-brand-olive">05 / MEMUAT</p>
              <h2 id="feedback-title" className="font-heading text-xl font-semibold tracking-subtitle sm:text-2xl">
                Skeleton
              </h2>
            </div>
            <Card>
              <div className="space-y-3" aria-label="Contoh skeleton saat memuat">
                <p className="text-sm font-medium">Contoh pemuatan</p>
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
              </div>
            </Card>
          </section>

          <section id="empty" aria-labelledby="empty-title" className="min-w-0 scroll-mt-6 space-y-4">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-label text-brand-olive">06 / KOSONG</p>
              <h2 id="empty-title" className="font-heading text-xl font-semibold tracking-subtitle sm:text-2xl">
                Empty state
              </h2>
            </div>
            <Card className="p-0">
              <Empty className="min-h-52 rounded-card border border-dashed border-border bg-background">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Inbox aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>Belum ada contoh</EmptyTitle>
                  <EmptyDescription>Tidak ada contoh untuk ditampilkan.</EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button variant="outline" className={LANDING_ACTION_CLASS}>Tambah contoh</Button>
                </EmptyContent>
              </Empty>
            </Card>
          </section>

          <section id="overlay" aria-labelledby="overlay-title" className="min-w-0 scroll-mt-6 space-y-4 lg:col-span-2">
            <div>
              <p className="mb-1 text-xs font-semibold tracking-label text-brand-olive">07 / LAPISAN</p>
              <h2 id="overlay-title" className="font-heading text-xl font-semibold tracking-subtitle sm:text-2xl">
                Tooltip dan panel
              </h2>
            </div>
            <Card className="gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-copy">
                <CardTitle className="mb-2">Kontrol kontekstual</CardTitle>
                <CardDescription>
                  Tooltip muncul saat fokus atau hover; panel dapat dibuka dan ditutup dengan keyboard.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-3">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger className={buttonVariants({ variant: "outline", className: LANDING_ACTION_CLASS })}>
                      <CalendarDays aria-hidden="true" />
                      Petunjuk
                    </TooltipTrigger>
                    <TooltipContent side="top">Keterangan singkat untuk kontrol ini.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <Sheet>
                  <SheetTrigger className={buttonVariants({ className: LANDING_ACTION_CLASS })}>
                    Buka panel
                  </SheetTrigger>
                  <SheetContent side="right" className="w-full sm:max-w-md">
                    <SheetHeader>
                      <SheetTitle>Panel detail</SheetTitle>
                      <SheetDescription>
                        Panel samping yang digunakan untuk menampilkan detail tanpa meninggalkan halaman.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="px-4 text-sm text-muted-foreground">
                      Konten panel tetap dapat dijangkau dan ditutup dengan keyboard.
                    </div>
                    <SheetFooter>
                      <SheetClose className={buttonVariants({ variant: "outline", className: LANDING_ACTION_CLASS })}>
                        Tutup panel
                      </SheetClose>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>
            </Card>
          </section>
        </div>
      </main>
    </AppShell>
  )
}
