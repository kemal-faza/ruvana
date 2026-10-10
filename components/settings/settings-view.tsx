"use client"

import { useActionState, useState, useSyncExternalStore, type FormEvent } from "react"
import { Monitor, Moon, Settings2, ShieldCheck, Sun, UserRound } from "lucide-react"
import { useTheme } from "next-themes"

import { changePasswordAction, revokeOtherSessionsAction, updateProfileAction } from "@/app/pengaturan/actions"
import type { SessionUser } from "@/lib/auth"
import { BUTTON_ACTION_CLASS, Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { INPUT_BASELINE_CLASS, Input } from "@/components/ui/input"

type Section = "general" | "profil" | "keamanan"
type ThemePreference = "system" | "light" | "dark"

interface SettingsViewProps {
  account: SessionUser
}

const ROLE_LABEL: Record<SessionUser["role"], string> = {
  pengguna: "Pengguna",
  petugas: "Petugas",
  admin: "Admin",
}

const SECTION_ITEMS: { id: Section; label: string; icon: typeof UserRound }[] = [
  { id: "general", label: "General", icon: Settings2 },
  { id: "profil", label: "Profil", icon: UserRound },
  { id: "keamanan", label: "Keamanan & masuk", icon: ShieldCheck },
]

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Monitor }[] = [
  { value: "system", label: "Ikuti tema sistem", icon: Monitor },
  { value: "light", label: "Tema terang", icon: Sun },
  { value: "dark", label: "Tema gelap", icon: Moon },
]

export function SettingsView({ account }: SettingsViewProps) {
  const [section, setSection] = useState<Section>("general")

  return (
    <main id="konten" tabIndex={-1} className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Pengaturan akun</h1>
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
          {section === "general" && <GeneralSection />}
          {section === "profil" && <ProfileSection account={account} />}
          {section === "keamanan" && <SecuritySection />}
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

function SecuritySection() {
  const [passwordState, passwordAction, passwordPending] = useActionState(changePasswordAction, { ok: false, message: "" })
  const [sessionsState, sessionsAction, sessionsPending] = useActionState(revokeOtherSessionsAction, { ok: false, message: "" })

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Keamanan & masuk</CardTitle>
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

function GeneralSection() {
  const { theme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)

  return (
    <Card>
      <CardHeader>
        <CardTitle>General</CardTitle>
      </CardHeader>
      <CardContent className="flex max-w-xl flex-col gap-5">
        <Field>
          <FieldLabel htmlFor="settings-language">Bahasa</FieldLabel>
          <Input id="settings-language" value="Bahasa Indonesia" readOnly className={INPUT_BASELINE_CLASS} />
        </Field>

        <div className="flex flex-col gap-2">
          <p id="settings-theme-label" className="text-sm font-medium">Tema</p>
          <ButtonGroup aria-labelledby="settings-theme-label">
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
              const selected = mounted && theme === value

              return (
                <Button
                  key={value}
                  type="button"
                  variant={selected ? "secondary" : "outline"}
                  size="icon"
                  aria-label={label}
                  aria-pressed={selected}
                  className="border-border"
                  onClick={() => setTheme(value)}
                >
                  <Icon aria-hidden="true" />
                </Button>
              )
            })}
          </ButtonGroup>
        </div>
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
