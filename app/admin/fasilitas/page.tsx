import type { Metadata } from "next";
import { redirect } from "next/navigation";

import AdminFacilities from "@/components/admin/AdminFacilities";
import { requireAdmin } from "@/lib/auth";
import { listAdminFacilities, listAdminLocations } from "@/lib/services/admin-facility-service";
import { cleanSearchParams } from "@/lib/validation/facility-query";
import { parseAdminListQuery, type AdminListQuery } from "@/lib/validation/admin-facility";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kelola fasilitas | ruvana",
  description: "Kelola daftar, detail, dan status fasilitas kampus.",
};

interface AdminFasilitasPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AdminFasilitasPage({ searchParams }: AdminFasilitasPageProps) {
  await requireAdmin();

  const raw = await searchParams;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "string") params.set(key, value);
  }

  const parsed = parseAdminListQuery(cleanSearchParams(params));
  const query: AdminListQuery = parsed.ok ? parsed.value : { page: 1, perPage: 20 };
  const [{ items, meta }, locations] = await Promise.all([
    listAdminFacilities(query),
    listAdminLocations(),
  ]);

  // Halaman di luar rentang diarahkan ke halaman terakhir yang valid, sama seperti
  // katalog publik, agar tidak menampilkan "Halaman 99 dari 3" dengan tautan rusak.
  if (meta.totalPages > 0 && query.page > meta.totalPages) {
    const canonical = new URLSearchParams();
    if (query.search) canonical.set("search", query.search);
    if (query.type) canonical.set("type", query.type);
    if (query.location) canonical.set("location", query.location);
    if (query.status) canonical.set("status", query.status);
    if (query.perPage !== 20) canonical.set("perPage", String(query.perPage));
    canonical.set("page", String(meta.totalPages));
    redirect(`/admin/fasilitas?${canonical.toString()}`);
  }

  return (
    <AdminFacilities
      items={items}
      meta={meta}
      locations={locations}
      filters={{
        search: query.search,
        type: query.type,
        location: query.location,
        status: query.status,
        perPage: query.perPage,
      }}
    />
  );
}
