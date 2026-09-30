import type { Metadata } from "next";

import { SettingsView } from "@/components/settings/settings-view";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Pengaturan admin | ruvana",
};

export default async function PengaturanAdminPage() {
  const admin = await requireAdmin();
  return <SettingsView account={admin} />;
}
