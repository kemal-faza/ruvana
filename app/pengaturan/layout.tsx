import type { ReactNode } from "react";

import { AppShell } from "@/components/app-shell/app-shell";
import { navigation, shellAccountFromUser } from "@/config/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function PengaturanLayout({ children }: { children: ReactNode }) {
  const account = shellAccountFromUser(await getSessionUser());

  return (
    <AppShell navigation={navigation} account={account}>
      <div className="flex-1">{children}</div>
    </AppShell>
  );
}
