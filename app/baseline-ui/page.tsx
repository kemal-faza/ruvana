import { Inbox } from "lucide-react"

import { AppShell } from "@/components/app-shell/app-shell"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { navigation, shellAccount, shellLogoutDestination } from "@/config/navigation"

export default function Home() {
  return (
    <AppShell
      navigation={navigation}
      account={shellAccount}
      logoutDestination={shellLogoutDestination}
    >
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-medium tracking-wide text-primary">Pratinjau UI</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Baseline UI Ruvana
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Katalog komponen dasar untuk menjaga bahasa visual Ruvana tetap konsisten.
          </p>
        </header>

        <div className="grid min-w-0 gap-6 md:grid-cols-2">
          <section aria-labelledby="button-title" className="min-w-0 space-y-4">
            <h2 id="button-title" className="font-heading text-xl font-semibold">
              Button
            </h2>
            <Card>
              <CardContent className="flex flex-wrap gap-3">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button loading>Memuat</Button>
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="field-title" className="min-w-0 space-y-4">
            <h2 id="field-title" className="font-heading text-xl font-semibold">
              Field
            </h2>
            <Card>
              <CardContent>
                <Field>
                  <FieldLabel htmlFor="contoh-nama" required>
                    Nama contoh
                  </FieldLabel>
                  <Input
                    id="contoh-nama"
                    aria-describedby="contoh-nama-help contoh-nama-error"
                    aria-invalid="true"
                    required
                    placeholder="Ketik nilai"
                  />
                  <FieldDescription id="contoh-nama-help">
                    Bantuan singkat untuk mengisi field.
                  </FieldDescription>
                  <FieldError id="contoh-nama-error">Contoh pesan kesalahan.</FieldError>
                </Field>
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="card-title" className="min-w-0 space-y-4">
            <h2 id="card-title" className="font-heading text-xl font-semibold">
              Card
            </h2>
            <Card>
              <CardHeader>
                <CardTitle>Ringkasan komponen</CardTitle>
                <CardDescription>Struktur konten dengan header dan footer.</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Konten utama ditempatkan di area ini.</p>
              </CardContent>
              <CardFooter>
                <Badge variant="success">Siap</Badge>
              </CardFooter>
            </Card>
          </section>

          <section aria-labelledby="badge-title" className="min-w-0 space-y-4">
            <h2 id="badge-title" className="font-heading text-xl font-semibold">
              Badge
            </h2>
            <Card>
              <CardContent className="flex flex-wrap gap-2">
                <Badge variant="pending">Menunggu</Badge>
                <Badge variant="success">Disetujui</Badge>
                <Badge variant="danger">Ditolak</Badge>
                <Badge variant="info">Informasi</Badge>
                <Badge variant="neutral">Netral</Badge>
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="skeleton-title" className="min-w-0 space-y-4">
            <h2 id="skeleton-title" className="font-heading text-xl font-semibold">
              Skeleton
            </h2>
            <Card>
              <CardContent className="space-y-3">
                <p className="text-sm font-medium">Contoh pemuatan</p>
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="empty-title" className="min-w-0 space-y-4">
            <h2 id="empty-title" className="font-heading text-xl font-semibold">
              Empty state
            </h2>
            <Card>
              <CardContent className="p-0">
                <Empty className="min-h-56 border-0">
                  <EmptyHeader>
                    <EmptyMedia variant="icon">
                      <Inbox aria-hidden="true" />
                    </EmptyMedia>
                    <EmptyTitle>Belum ada contoh</EmptyTitle>
                    <EmptyDescription>Tidak ada contoh untuk ditampilkan.</EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button variant="outline">Tambah contoh</Button>
                  </EmptyContent>
                </Empty>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </AppShell>
  )
}
