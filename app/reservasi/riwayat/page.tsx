import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "cn";

import { AppShell } from "@/components/app-shell/app-shell";
import { ReservationHistoryList } from "@/components/reservation/reservation-history-list";
import { BUTTON_ACTION_CLASS, Button } from "@/components/ui/button";
import { reservasiNavigation } from "../navigation";
import { shellAccountFromUser } from "@/config/navigation";
import { requirePengguna } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Reservasi | ruvana",
  description: "Lihat status dan detail seluruh reservasi milik Anda.",
};

export default async function RiwayatReservasiPage() {
  // Guard server (IAM-03): tanpa sesi ke /login, role lain ke /403.
  // Riwayat dibaca komponen klien lewat API milik pengguna.
  const pengguna = await requirePengguna();
  const account = shellAccountFromUser(pengguna);

  return (
    <AppShell navigation={reservasiNavigation} account={account}>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-6 lg:p-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Reservasi</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Riwayat reservasi milik Anda dalam semua status. Pilih salah satu untuk melihat detail lengkap.
            </p>
          </div>
          <Button
            className={cn(BUTTON_ACTION_CLASS, "shrink-0")}
            render={<Link href="/reservasi" />}
          >
            <Plus aria-hidden="true" />
            Ajukan Reservasi
          </Button>
        </header>
        <ReservationHistoryList />
      </main>
    </AppShell>
  );
}
