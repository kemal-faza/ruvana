"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react"
import { useEffect, useState } from "react"

import { AuthPhotoPanel } from "@/components/AuthPhotoPanel"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { BATAS_EMAIL_AKUN_KARAKTER, BATAS_PASSWORD_AKUN_MIN_BYTE, BATAS_PASSWORD_AKUN_BYTE } from "@/config/business"
import { getPostLoginPath } from "@/lib/auth-routing"
import { useHydrated } from "@/lib/use-hydrated"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LoginForm() {
  const router = useRouter()
  const [state, setState] = useState({
    pesan: "",
    fieldErrors: {} as Record<string, string[]>,
  })
  const [pending, setPending] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const hydrated = useHydrated()

  const emailError = state.fieldErrors?.email?.[0]
  const passwordError = state.fieldErrors?.password?.[0]

  useEffect(() => {
    if (emailError) document.getElementById("login-email")?.focus()
    else if (passwordError) document.getElementById("login-password")?.focus()
    else if (state.pesan) document.getElementById("login-error")?.focus()
  }, [emailError, passwordError, state.pesan])

  return (
    <main className="min-h-dvh bg-background md:grid md:grid-cols-2">
      <AuthPhotoPanel />

      <section
        aria-labelledby="login-title"
        className="relative flex min-h-dvh items-center justify-center px-6 py-28 sm:px-10 lg:px-12"
      >
        <header className="absolute inset-x-0 top-0 flex items-center justify-between gap-4 p-4 sm:p-6 lg:p-8">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors duration-motion-standard hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Kembali
          </Link>
          <ThemeToggle />
        </header>

        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 id="login-title" className="text-2xl font-semibold tracking-tight">Masuk ke akun</h1>
          </div>

          {/* `method="post"` adalah jaring pengaman: bila submit native terjadi
              sebelum hidrasi, kredensial tidak ikut masuk query string. `action`
              sengaja tidak diisi karena /api/auth/login hanya menerima JSON. */}
          <form
            className="flex flex-col gap-5"
            method="post"
            noValidate
            onSubmit={async (event) => {
              event.preventDefault()
              const form = new FormData(event.currentTarget)
              const email = String(form.get("email") ?? "").trim()
              const password = String(form.get("password") ?? "")
              const passwordBytes = new TextEncoder().encode(password).length
              const fieldErrors: Record<string, string[]> = {}
              if (!email) fieldErrors.email = ["Email wajib diisi."]
              else if (!EMAIL_RE.test(email) || email.length > BATAS_EMAIL_AKUN_KARAKTER) {
                fieldErrors.email = ["Format email tidak valid."]
              }
              if (!password) fieldErrors.password = ["Kata sandi wajib diisi."]
              else if (passwordBytes < BATAS_PASSWORD_AKUN_MIN_BYTE) fieldErrors.password = [`Kata sandi minimal ${BATAS_PASSWORD_AKUN_MIN_BYTE} karakter.`]
              else if (passwordBytes > BATAS_PASSWORD_AKUN_BYTE) {
                fieldErrors.password = [`Kata sandi maksimal ${BATAS_PASSWORD_AKUN_BYTE} karakter.`]
              }
              if (Object.keys(fieldErrors).length > 0) {
                setState({ pesan: "", fieldErrors })
                return
              }
              setPending(true)
              try {
                const response = await fetch("/api/auth/login", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, password }),
                })
                const result = await response.json()
                if (response.ok) {
                  router.replace(getPostLoginPath(result.user.role))
                  router.refresh()
                  return
                }
                const fieldErrors: Record<string, string[]> = {}
                if (response.status === 422 && Array.isArray(result.errors)) {
                  for (const error of result.errors) {
                    if (typeof error.field === "string" && typeof error.message === "string") {
                      fieldErrors[error.field] = [error.message]
                    }
                  }
                }
                setState({ pesan: result.detail ?? "Gagal masuk. Coba lagi.", fieldErrors })
              } catch {
                setState({ pesan: "Gagal terhubung. Coba lagi.", fieldErrors: {} })
              } finally {
                setPending(false)
              }
            }}
          >
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
                  onInput={() => {
                    if (emailError) setState((previous) => ({
                      ...previous,
                      pesan: "",
                      fieldErrors: { ...previous.fieldErrors, email: [] },
                    }))
                  }}
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
                  type={passwordVisible ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Masukkan kata sandi"
                  required
                  onInput={() => {
                    if (passwordError) setState((previous) => ({
                      ...previous,
                      pesan: "",
                      fieldErrors: { ...previous.fieldErrors, password: [] },
                    }))
                  }}
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={passwordError ? "login-password-error" : "login-password-help"}
                  className="h-11 pl-10 pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={passwordVisible ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  aria-controls="login-password"
                  aria-pressed={passwordVisible}
                  onClick={() => setPasswordVisible((visible) => !visible)}
                  className="absolute right-0 top-0 rounded-l-none"
                >
                  {passwordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </Button>
              </div>
              <FieldDescription id="login-password-help">Kata sandi minimal {BATAS_PASSWORD_AKUN_MIN_BYTE} karakter.</FieldDescription>
              {passwordError && (
                <FieldError id="login-password-error">{passwordError}</FieldError>
              )}
            </Field>

            {state.pesan && (
              <p
                id="login-error"
                tabIndex={-1}
                role="alert"
                className="rounded-lg bg-destructive-subdued px-3 py-2.5 text-sm text-destructive-subdued-foreground"
              >
                {state.pesan}
              </p>
            )}

            <Button type="submit" size="lg" loading={pending} disabled={!hydrated} className="mt-1 min-h-11 w-full">
              Masuk
            </Button>

            <FieldDescription className="text-center">
              Akun baru dapat masuk setelah disetujui admin.
            </FieldDescription>
            <p className="text-center text-sm">
              Belum punya akun? <Link href="/daftar" className="font-medium text-primary underline">Daftar</Link>
            </p>
          </form>
        </div>
      </section>
    </main>
  )
}
