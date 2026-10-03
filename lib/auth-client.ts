type AuthNavigation = {
  replace: (href: string) => void;
  refresh: () => void;
};

export async function logoutFromBrowser(router: AuthNavigation): Promise<void> {
  const response = await fetch("/api/auth/logout", { method: "POST" });
  if (!response.ok && response.status !== 401) throw new Error("Gagal keluar. Coba lagi.");
  router.replace("/login");
  router.refresh();
}
