"use client"

import Link from "next/link"
import { ArrowLeft, LockKeyhole, Mail, UserRound } from "lucide-react"
import { useActionState, useEffect } from "react"

import { daftar } from "@/app/daftar/actions"
import { AuthPhotoPanel } from "@/components/AuthPhotoPanel"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  BATAS_EMAIL_AKUN_KARAKTER,
  BATAS_NAMA_AKUN_KARAKTER,
  BATAS_PASSWORD_AKUN_BYTE,
} from "@/config/business"

export default function RegisterForm() {
  const [state, action, pending] = useActionState(daftar, { ok: false, pesan: "" })

  useEffect(() => {
    const firstError = ["nama", "email", "password"].find((field) => state.fieldErrors?.[field])
    if (firstError) document.getElementById(`daftar-${firstError}`)?.focus()
    else if (state.pesan) document.getElementById("daftar-message")?.focus()
  }, [state])

  return (
    <main className="min-h-dvh bg-background md:grid md:grid-cols-2">
      <AuthPhotoPanel />

      <section
        aria-labelledby="daftar-title"
        className="relative flex min-h-dvh items-center justify-center px-6 py-28 sm:px-10 md:pt-20 md:pb-4 lg:px-12"
      >
        <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-4 p-4 sm:p-6 lg:p-8">
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors duration-motion-standard hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Kembali
          </Link>
          <ThemeToggle />
        </header>

        <div className="w-full max-w-sm">
          <div className="mb-8 space-y-2 text-center">
            <h1 id="daftar-title" className="text-2xl font-semibold tracking-tight">
              Daftar akun
            </h1>
            <p className="text-sm/relaxed text-muted-foreground">
              Akun pengguna baru perlu disetujui admin sebelum dapat masuk.
            </p>
          </div>

          <form
            action={action}
            className="flex flex-col gap-5"
            noValidate
            onSubmit={(event) => {
              const form = event.currentTarget
              const nama = form.elements.namedItem("nama") as HTMLInputElement
              const email = form.elements.namedItem("email") as HTMLInputElement
              const password = form.elements.namedItem("password") as HTMLInputElement
              const passwordLength = new TextEncoder().encode(password.value).length

              nama.setCustomValidity(!nama.value.trim() ? "Nama lengkap wajib diisi." : "")
              email.setCustomValidity(
                !email.value.trim()
                  ? "Email wajib diisi."
                  : !email.validity.valid
                    ? "Masukkan alamat email yang valid."
                    : "",
              )
              password.setCustomValidity(
                passwordLength < 8
                  ? "Kata sandi harus berisi minimal 8 karakter."
                  : passwordLength > BATAS_PASSWORD_AKUN_BYTE
                    ? `Kata sandi maksimal ${BATAS_PASSWORD_AKUN_BYTE} byte.`
                    : "",
              )

              const firstInvalid = [nama, email, password].find((input) => !input.validity.valid)
              if (firstInvalid) {
                firstInvalid.reportValidity()
                event.preventDefault()
              }
            }}
          >
            <Field data-invalid={!!state.fieldErrors?.nama || undefined}>
              <FieldLabel htmlFor="daftar-nama" required>Nama lengkap</FieldLabel>
              <div className="relative">
                <UserRound
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="daftar-nama"
                  name="nama"
                  autoComplete="name"
                  placeholder="Nama lengkap"
                  maxLength={BATAS_NAMA_AKUN_KARAKTER}
                  required
                  onInput={(event) => event.currentTarget.setCustomValidity("")}
                  aria-invalid={!!state.fieldErrors?.nama || undefined}
                  aria-describedby={state.fieldErrors?.nama ? "daftar-nama-error" : undefined}
                  className="h-11 pl-10"
                />
              </div>
              {state.fieldErrors?.nama && (
                <FieldError id="daftar-nama-error">{state.fieldErrors.nama[0]}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!state.fieldErrors?.email || undefined}>
              <FieldLabel htmlFor="daftar-email" required>Email</FieldLabel>
              <div className="relative">
                <Mail
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="daftar-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nama@ruvana.id"
                  maxLength={BATAS_EMAIL_AKUN_KARAKTER}
                  required
                  onInput={(event) => event.currentTarget.setCustomValidity("")}
                  aria-invalid={!!state.fieldErrors?.email || undefined}
                  aria-describedby={state.fieldErrors?.email ? "daftar-email-error" : undefined}
                  className="h-11 pl-10"
                />
              </div>
              {state.fieldErrors?.email && (
                <FieldError id="daftar-email-error">{state.fieldErrors.email[0]}</FieldError>
              )}
            </Field>

            <Field data-invalid={!!state.fieldErrors?.password || undefined}>
              <FieldLabel htmlFor="daftar-password" required>Kata sandi</FieldLabel>
              <div className="relative">
                <LockKeyhole
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  id="daftar-password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Buat kata sandi"
                  minLength={8}
                  required
                  onInput={(event) => event.currentTarget.setCustomValidity("")}
                  aria-invalid={!!state.fieldErrors?.password || undefined}
                  aria-describedby={state.fieldErrors?.password ? "daftar-password-error" : "daftar-password-help"}
                  className="h-11 pl-10"
                />
              </div>
              <p id="daftar-password-help" className="text-sm text-muted-foreground">
                Kata Sandi minimal 8 karakter.
              </p>
              {state.fieldErrors?.password && (
                <FieldError id="daftar-password-error">{state.fieldErrors.password[0]}</FieldError>
              )}
            </Field>

            {state.pesan && (
              <p
                id="daftar-message"
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

            <Button type="submit" size="lg" loading={pending} disabled={state.ok} className="mt-1 min-h-11 w-full">
              Daftar
            </Button>
            <p className="text-center text-sm">
              Sudah punya akun?{" "}
              <Link href="/login" className="font-medium text-primary underline">Masuk</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  )
}
