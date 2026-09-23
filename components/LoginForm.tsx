"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, LockKeyhole, Mail } from "lucide-react"
import { useActionState, useEffect } from "react"

import { login } from "@/app/login/actions"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, {
    ok: false,
    pesan: "",
  })

  const emailError = state.fieldErrors?.email?.[0]
  const passwordError = state.fieldErrors?.password?.[0]

  useEffect(() => {
    if (emailError) document.getElementById("login-email")?.focus()
    else if (passwordError) document.getElementById("login-password")?.focus()
    else if (state.pesan) document.getElementById("login-error")?.focus()
  }, [emailError, passwordError, state.pesan])

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
            Kembali
          </Link>
          <ThemeToggle />
        </header>

        <div className="grid flex-1 items-center gap-6 py-8 md:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)] lg:gap-16 lg:py-12">
          <section
            aria-labelledby="login-intro-title"
            className="relative min-h-[min(15rem,40dvh)] overflow-hidden rounded-card bg-muted sm:min-h-[min(22rem,60dvh)] md:min-h-[min(28rem,calc(100dvh_-_10rem))] lg:min-h-[min(36rem,calc(100dvh_-_10rem))]"
          >
            <Image
              src="/fsm-login.jpg"
              alt="Gedung Fakultas Sains dan Matematika Universitas Diponegoro"
              fill
              priority
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover"
            />
            <div aria-hidden="true" className="absolute inset-0 bg-primary-950/55" />
            <div className="absolute inset-x-0 bottom-0 max-w-xl p-5 text-white sm:p-7 lg:p-9">
              <h2 id="login-intro-title" className="text-2xl/tight font-semibold tracking-tight">
                Kelola kebutuhan fasilitas lebih terstruktur.
              </h2>
              <p className="mt-3 max-w-lg text-sm/relaxed text-white/90 sm:text-base/relaxed">
                Satu akses untuk reservasi ruang, pemantauan permintaan, dan pengelolaan fasilitas.
              </p>
            </div>
          </section>

          <section aria-labelledby="login-title" className="mx-auto w-full max-w-md px-1 sm:px-2">
            <header className="mb-8 space-y-2">
              <h1 id="login-title" className="text-2xl font-semibold tracking-tight">Masuk ke akun</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Gunakan email dan kata sandi akun yang telah aktif.
              </p>
            </header>

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
                      placeholder="nama@ruvana.id"
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
                    id="login-error"
                    tabIndex={-1}
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
                <p className="text-center text-sm">
                  Belum punya akun? <Link href="/daftar" className="font-medium text-primary underline">Daftar</Link>
                </p>
            </form>
          </section>
        </div>
      </div>
    </main>
  )
}
