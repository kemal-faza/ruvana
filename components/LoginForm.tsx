"use client"

import Link from "next/link"
import { ArrowLeft, Building2, CalendarCheck2, LockKeyhole, Mail, ShieldCheck } from "lucide-react"
import { useActionState } from "react"

import { login } from "@/app/login/actions"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const manfaat = [
  {
    icon: CalendarCheck2,
    title: "Reservasi terpusat",
    description: "Ajukan dan pantau penggunaan fasilitas kampus dalam satu tempat.",
  },
  {
    icon: Building2,
    title: "Informasi yang jelas",
    description: "Lihat fasilitas, jadwal, dan status permintaan dengan mudah.",
  },
  {
    icon: ShieldCheck,
    title: "Akses sesuai peran",
    description: "Setiap akun memperoleh fitur sesuai kewenangannya.",
  },
] as const

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, {
    ok: false,
    pesan: "",
  })

  const emailError = state.fieldErrors?.email?.[0]
  const passwordError = state.fieldErrors?.password?.[0]

  return (
    <main className="relative min-h-dvh overflow-hidden bg-background">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top_left,var(--primary-subdued),transparent_68%)] opacity-70"
      />

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col p-4 sm:p-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors duration-motion-standard hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Kembali ke beranda
          </Link>
          <ThemeToggle />
        </header>

        <div className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:gap-16 lg:py-12">
          <section aria-labelledby="login-intro-title" className="hidden max-w-xl lg:block">
            <p className="mb-4 text-sm font-medium tracking-wide text-primary">
              Sistem fasilitas kampus
            </p>
            <h2
              id="login-intro-title"
              className="text-4xl/tight font-semibold tracking-tight text-balance"
            >
              Kelola kebutuhan fasilitas dengan lebih tenang.
            </h2>
            <p className="mt-4 max-w-lg text-base/relaxed text-muted-foreground">
              Satu akses untuk reservasi ruang, pemantauan permintaan, dan pengelolaan fasilitas
              sesuai peran Anda.
            </p>

            <ul className="mt-10 grid gap-5" aria-label="Manfaat sistem">
              {manfaat.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.title} className="flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-subdued text-primary-subdued-foreground">
                      <Icon aria-hidden="true" className="size-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">{item.title}</span>
                      <span className="mt-1 block text-sm/relaxed text-muted-foreground">
                        {item.description}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>

          <Card className="mx-auto w-full max-w-md hover:translate-y-0">
            <CardHeader className="gap-2">
              <p className="text-sm font-medium text-primary lg:hidden">Sistem fasilitas kampus</p>
              <h1 className="text-2xl font-semibold tracking-tight">Masuk ke akun</h1>
              <CardDescription className="leading-relaxed">
                Gunakan email dan kata sandi akun yang telah aktif.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form action={action} className="flex flex-col gap-5">
                <Field data-invalid={emailError ? true : undefined}>
                  <FieldLabel htmlFor="login-email" required>
                    Email
                  </FieldLabel>
                  <div className="relative">
                    <Mail
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="nama@kampus.ac.id"
                      required
                      aria-invalid={emailError ? true : undefined}
                      aria-describedby={emailError ? "login-email-error" : undefined}
                      className="h-11 pl-10"
                    />
                  </div>
                  {emailError && <FieldError id="login-email-error">{emailError}</FieldError>}
                </Field>

                <Field data-invalid={passwordError ? true : undefined}>
                  <FieldLabel htmlFor="login-password" required>
                    Kata sandi
                  </FieldLabel>
                  <div className="relative">
                    <LockKeyhole
                      aria-hidden="true"
                      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Masukkan kata sandi"
                      required
                      aria-invalid={passwordError ? true : undefined}
                      aria-describedby={passwordError ? "login-password-error" : undefined}
                      className="h-11 pl-10"
                    />
                  </div>
                  {passwordError && (
                    <FieldError id="login-password-error">{passwordError}</FieldError>
                  )}
                </Field>

                {state.pesan && (
                  <p
                    role={state.ok ? "status" : "alert"}
                    className={
                      state.ok
                        ? "rounded-lg bg-success-subdued px-3 py-2.5 text-sm text-success-subdued-foreground"
                        : "rounded-lg bg-destructive-subdued px-3 py-2.5 text-sm text-destructive-subdued-foreground"
                    }
                  >
                    {state.pesan}
                  </p>
                )}

                <Button type="submit" size="lg" loading={pending} className="mt-1 min-h-11 w-full">
                  Masuk
                </Button>

                <FieldDescription className="text-center">
                  Akun baru dapat masuk setelah disetujui admin.
                </FieldDescription>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}
