"use client"

import { useActionState, useState, type FormEvent } from "react"
import Link from "next/link"
import { Bell, Languages, MoonStar, ShieldCheck, UserRound } from "lucide-react"

import { changePasswordAction, revokeOtherSessionsAction, updateProfileAction } from "@/app/pengaturan/actions"
import type { SessionUser } from "@/lib/auth"
import { BUTTON_ACTION_CLASS, Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { INPUT_BASELINE_CLASS, Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"

type Section = "profil" | "notifikasi" | "keamanan" | "bahasa" | "tampilan"

interface SettingsViewProps {
  account: SessionUser
}

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  pengguna: "Pengguna",
  petugas: "Petugas",
  admin: "Admin",
}

const SECTION_ITEMS: { id: Section; label: string; icon: typeof UserRound }[] = [
  { id: "profil", label: "Profil", icon: UserRound },
  { id: "notifikasi", label: "Notifikasi", icon: Bell },
  { id: "keamanan", label: "Keamanan & masuk", icon: ShieldCheck },
  { id: "bahasa", label: "Bahasa", icon: Languages },
  { id: "tampilan", label: "Tampilan", icon: MoonStar },
]

export function SettingsView({ account }: SettingsViewProps) {
  const [section, setSection] = useState<Section>("profil")

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="max-w-2xl space-y-2">
        <p className="text-sm font-medium tracking-wide text-primary">Akun</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Kelola profil, keamanan masuk, dan preferensi akun {ROLE_LABEL[account.role].toLowerCase()} Anda.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
        <nav aria-label="Bagian pengaturan" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
          {SECTION_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={section === id}
              onClick={() => setSection(id)}
              className={`flex min-h-11 shrink-0 items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                section === id
                  ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {section === "profil" && <ProfileSection account={account} />}
          {section === "notifikasi" && <NotificationsSection role={account.role} />}
          {section === "keamanan" && <SecuritySection />}
          {section === "bahasa" && <LanguageSection />}
          {section === "tampilan" && <AppearanceSection />}
        </div>
      </div>
    </main>
  )
}

function ProfileSection({ account }: SettingsViewProps) {
  const [state, action, pending] = useActionState(updateProfileAction, { ok: false, message: "" })

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil</CardTitle>
        <CardDescription>Informasi yang digunakan untuk mengenali akun Anda di Ruvana.</CardDescription>
      </CardHeader>
      <CardContent>
        <form key={account.nama} action={action} className="flex max-w-xl flex-col gap-5">
          <Field data-invalid={Boolean(state.fieldErrors?.nama) || undefined}>
            <FieldLabel htmlFor="settings-name" required>Nama</FieldLabel>
            <Input
              id="settings-name"
              name="nama"
              defaultValue={account.nama}
              autoComplete="name"
              minLength={3}
              maxLength={100}
              className={INPUT_BASELINE_CLASS}
              required
              aria-invalid={Boolean(state.fieldErrors?.nama) || undefined}
              aria-describedby={state.fieldErrors?.nama ? "settings-name-error" : undefined}
            />
            {state.fieldErrors?.nama && <FieldError id="settings-name-error">{state.fieldErrors.nama}</FieldError>}
          </Field>

          <Field>
            <FieldLabel htmlFor="settings-email">Email</FieldLabel>
            <Input id="settings-email" value={account.email} readOnly className={INPUT_BASELINE_CLASS} />
            <p className="text-sm text-muted-foreground">
              Email belum dapat diubah karena Ruvana belum menyediakan verifikasi perubahan email.
            </p>
          </Field>

          <Field>
            <FieldLabel>Peran</FieldLabel>
            <p className="rounded-md border border-input bg-muted/40 px-3 py-2 text-sm">{ROLE_LABEL[account.role]}</p>
          </Field>

          <ActionFeedback ok={state.ok} message={state.message} />
          <div>
            <Button type="submit" disabled={pending} className={BUTTON_ACTION_CLASS}>
              {pending ? "Menyimpan…" : "Simpan perubahan"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function NotificationsSection({ role }: { role: SessionUser["role"] }) {
  const roleCopy: Record<SessionUser["role"], { title: string; description: string; links: { label: string; href: string }[] }> = {
    pengguna: {
      title: "Pantau reservasi dan laporan Anda",
      description: "Status dan keputusan terbaru dapat dilihat langsung di halaman berikut.",
      links: [
        { label: "Reservasi Saya", href: "/reservasi/riwayat" },
        { label: "Laporan", href: "/reports" },
      ],
    },
    petugas: {
      title: "Pantau pekerjaan petugas",
      description: "Antrean reservasi yang perlu diproses tersedia di halaman persetujuan.",
      links: [{ label: "Persetujuan reservasi", href: "/petugas/antrian" }],
    },
    admin: {
      title: "Pantau administrasi",
      description: "Pendaftaran akun dan ringkasan operasional tersedia di halaman admin.",
      links: [
        { label: "Kelola pengguna", href: "/admin/pengguna" },
        { label: "Analitik", href: "/admin/analitik" },
      ],
    },
  }
  const copy = roleCopy[role]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifikasi</CardTitle>
        <CardDescription>Informasi pembaruan yang relevan dengan peran Anda.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h2 className="font-medium">{copy.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
        </div>
        <p className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          Notifikasi otomatis melalui email, WhatsApp, atau push belum tersedia pada rilis ini.
          Pembaruan dapat dipantau di halaman terkait.
        </p>
        <ul className="flex flex-wrap gap-3">
          {copy.links.map((link) => (
            <li key={link.href}>
              <Button variant="outline" className={BUTTON_ACTION_CLASS} render={<Link href={link.href} />}>{link.label}</Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function SecuritySection() {
  const [passwordState, passwordAction, passwordPending] = useActionState(changePasswordAction, { ok: false, message: "" })
  const [sessionsState, sessionsAction, sessionsPending] = useActionState(revokeOtherSessionsAction, { ok: false, message: "" })

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Keamanan & masuk</CardTitle>
          <CardDescription>Perbarui kata sandi dan kendalikan sesi akun Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            key={passwordState.ok ? "password-updated" : "password-form"}
            action={passwordAction}
            onSubmit={validatePasswordForm}
            className="flex max-w-xl flex-col gap-5"
          >
            <PasswordField name="currentPassword" label="Kata sandi saat ini" error={passwordState.fieldErrors?.currentPassword} autoComplete="current-password" />
            <PasswordField name="newPassword" label="Kata sandi baru" error={passwordState.fieldErrors?.newPassword} autoComplete="new-password" />
            <PasswordField name="confirmation" label="Ulangi kata sandi baru" error={passwordState.fieldErrors?.confirmation} autoComplete="new-password" />
            <p className="text-sm text-muted-foreground">Gunakan 8–72 byte UTF-8. Setelah diperbarui, sesi di perangkat lain akan diakhiri.</p>
            <ActionFeedback ok={passwordState.ok} message={passwordState.message} />
            <div>
              <Button type="submit" disabled={passwordPending} className={BUTTON_ACTION_CLASS}>
                {passwordPending ? "Memperbarui…" : "Perbarui kata sandi"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sesi masuk</CardTitle>
          <CardDescription>Akhiri sesi Ruvana di perangkat lain. Sesi yang sedang digunakan tetap aktif.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={sessionsAction} className="flex flex-col items-start gap-3">
            <ActionFeedback ok={sessionsState.ok} message={sessionsState.message} />
            <Button type="submit" variant="outline" disabled={sessionsPending} className={BUTTON_ACTION_CLASS}>
              {sessionsPending ? "Mengakhiri sesi…" : "Keluar dari perangkat lain"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function validatePasswordForm(event: FormEvent<HTMLFormElement>) {
  const form = event.currentTarget
  const current = form.elements.namedItem("currentPassword") as HTMLInputElement
  const password = form.elements.namedItem("newPassword") as HTMLInputElement
  const confirmation = form.elements.namedItem("confirmation") as HTMLInputElement
  current.setCustomValidity("")
  password.setCustomValidity("")
  confirmation.setCustomValidity("")

  const bytes = new TextEncoder().encode(password.value).length
  if (!current.value) current.setCustomValidity("Kata sandi saat ini wajib diisi.")
  if (bytes < 8 || bytes > 72) {
    password.setCustomValidity("Kata sandi baru harus berukuran 8–72 byte UTF-8.")
  }
  if (password.value !== confirmation.value) {
    confirmation.setCustomValidity("Konfirmasi kata sandi belum cocok.")
  }

  const firstInvalid = [current, password, confirmation].find((input) => !input.validity.valid)
  if (firstInvalid) {
    event.preventDefault()
    firstInvalid.reportValidity()
    firstInvalid.focus()
  }
}

function PasswordField({
  name,
  label,
  error,
  autoComplete,
}: {
  name: string
  label: string
  error?: string
  autoComplete: string
}) {
  const id = `settings-${name}`
  const errorId = `${id}-error`
  return (
    <Field data-invalid={Boolean(error) || undefined}>
      <FieldLabel htmlFor={id} required>{label}</FieldLabel>
      <Input
        id={id}
        name={name}
        type="password"
        autoComplete={autoComplete}
        required
        className={INPUT_BASELINE_CLASS}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
      />
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}

function LanguageSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bahasa</CardTitle>
        <CardDescription>Pilih bahasa antarmuka Ruvana.</CardDescription>
      </CardHeader>
      <CardContent>
        <Field>
          <FieldLabel htmlFor="settings-language">Bahasa antarmuka</FieldLabel>
          <Input id="settings-language" value="Bahasa Indonesia" readOnly className={INPUT_BASELINE_CLASS} />
          <p className="text-sm text-muted-foreground">
            Saat ini Ruvana tersedia dalam Bahasa Indonesia.
          </p>
        </Field>
      </CardContent>
    </Card>
  )
}

function AppearanceSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tampilan</CardTitle>
        <CardDescription>Atur tema warna untuk kenyamanan membaca.</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-medium">Tema</h2>
          <p className="mt-1 text-sm text-muted-foreground">Pilih tema terang atau gelap.</p>
        </div>
        <ThemeToggle />
      </CardContent>
    </Card>
  )
}

function ActionFeedback({ ok, message }: { ok: boolean; message: string }) {
  if (!message) return null
  return (
    <p role={ok ? "status" : "alert"} aria-live="polite" className={ok ? "text-sm text-foreground" : "text-sm text-destructive"}>
      {message}
    </p>
  )
}
