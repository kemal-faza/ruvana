import type { Metadata } from "next";

import { SettingsView } from "@/components/settings/settings-view";
import { requirePengguna } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Pengaturan akun | ruvana",
};

export default async function PengaturanAkunPage() {
  const pengguna = await requirePengguna("/pengaturan");
  return <SettingsView account={pengguna} />;
}
