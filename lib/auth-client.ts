export async function logoutFromBrowser(): Promise<void> {
  const response = await fetch("/api/auth/logout", { method: "POST" });
  if (!response.ok && response.status !== 401) throw new Error("Gagal keluar. Coba lagi.");
  window.location.assign("/login");
}
