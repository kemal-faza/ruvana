import type { Metadata } from "next";

import { SettingsView } from "@/components/settings/settings-view";
import { requirePetugas } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pengaturan petugas | ruvana",
};

export default async function PengaturanPetugasPage() {
  const petugas = await requirePetugas();
  return <SettingsView account={petugas} />;
}
