"use client";

import Link from "next/link";
import { useActionState, useEffect } from "react";
import { daftar } from "@/app/daftar/actions";
import {
  BATAS_EMAIL_AKUN_KARAKTER,
  BATAS_NAMA_AKUN_KARAKTER,
  BATAS_PASSWORD_AKUN_BYTE,
} from "@/config/business";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export default function RegisterForm() {
  const [state, action, pending] = useActionState(daftar, { ok: false, pesan: "" });

  useEffect(() => {
    const firstError = ["nama", "email", "password"].find((field) => state.fieldErrors?.[field]);
    if (firstError) document.getElementById(`daftar-${firstError}`)?.focus();
    else if (state.pesan) document.getElementById("daftar-message")?.focus();
  }, [state]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-5 p-4 sm:p-6">
      <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">← Kembali</Link>
      <Card>
        <CardHeader>
          <h1 className="text-2xl font-semibold">Daftar akun</h1>
          <CardDescription>Akun pengguna baru perlu disetujui admin sebelum dapat masuk.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={action}
            className="flex flex-col gap-5"
            noValidate
            onSubmit={(event) => {
              const form = event.currentTarget;
              const nama = form.elements.namedItem("nama") as HTMLInputElement;
              const email = form.elements.namedItem("email") as HTMLInputElement;
              const password = form.elements.namedItem("password") as HTMLInputElement;
              const passwordLength = new TextEncoder().encode(password.value).length;

              nama.setCustomValidity(!nama.value.trim() ? "Nama lengkap wajib diisi." : "");
              email.setCustomValidity(
                !email.value.trim()
                  ? "Email wajib diisi."
                  : !email.validity.valid
                    ? "Masukkan alamat email yang valid."
                    : "",
              );
              password.setCustomValidity(
                passwordLength < 8
                  ? "Kata sandi harus berisi minimal 8 karakter."
                  : passwordLength > BATAS_PASSWORD_AKUN_BYTE
                    ? `Kata sandi maksimal ${BATAS_PASSWORD_AKUN_BYTE} byte.`
                    : "",
              );

              const firstInvalid = [nama, email, password].find((input) => !input.validity.valid);
              if (firstInvalid) {
                firstInvalid.reportValidity();
                event.preventDefault();
              }
            }}
          >
            <Field data-invalid={!!state.fieldErrors?.nama || undefined}>
              <FieldLabel htmlFor="daftar-nama" required>Nama lengkap</FieldLabel>
              <Input id="daftar-nama" name="nama" autoComplete="name" maxLength={BATAS_NAMA_AKUN_KARAKTER} required onInput={(event) => event.currentTarget.setCustomValidity("")} aria-invalid={!!state.fieldErrors?.nama || undefined} aria-describedby={state.fieldErrors?.nama ? "daftar-nama-error" : undefined} />
              {state.fieldErrors?.nama && <FieldError id="daftar-nama-error">{state.fieldErrors.nama[0]}</FieldError>}
            </Field>
            <Field data-invalid={!!state.fieldErrors?.email || undefined}>
              <FieldLabel htmlFor="daftar-email" required>Email</FieldLabel>
              <Input id="daftar-email" name="email" type="email" autoComplete="email" maxLength={BATAS_EMAIL_AKUN_KARAKTER} required onInput={(event) => event.currentTarget.setCustomValidity("")} aria-invalid={!!state.fieldErrors?.email || undefined} aria-describedby={state.fieldErrors?.email ? "daftar-email-error" : undefined} />
              {state.fieldErrors?.email && <FieldError id="daftar-email-error">{state.fieldErrors.email[0]}</FieldError>}
            </Field>
            <Field data-invalid={!!state.fieldErrors?.password || undefined}>
              <FieldLabel htmlFor="daftar-password" required>Kata sandi</FieldLabel>
              <Input id="daftar-password" name="password" type="password" autoComplete="new-password" minLength={8} required onInput={(event) => event.currentTarget.setCustomValidity("")} aria-invalid={!!state.fieldErrors?.password || undefined} aria-describedby={state.fieldErrors?.password ? "daftar-password-error" : "daftar-password-help"} />
              <p id="daftar-password-help" className="text-sm text-muted-foreground">Kata sandi minimal 8 karakter.</p>
              {state.fieldErrors?.password && <FieldError id="daftar-password-error">{state.fieldErrors.password[0]}</FieldError>}
            </Field>
            {state.pesan && <p id="daftar-message" tabIndex={-1} role={state.ok ? "status" : "alert"} className="text-sm">{state.pesan}</p>}
            <Button type="submit" loading={pending} disabled={state.ok}>Daftar</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
