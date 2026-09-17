// Metadata situs terpusat untuk SEO (judul, deskripsi, OG, sitemap, robots).
export const SITE_NAME = "ruvana";
export const SITE_DESCRIPTION =
  "Sistem reservasi & pelaporan fasilitas kampus (ruang kelas, aula, laboratorium, alat, lapangan).";

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export const SITE_URL = resolveSiteUrl();
