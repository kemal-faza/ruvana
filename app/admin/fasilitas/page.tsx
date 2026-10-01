import type { Metadata } from "next";

import AdminFacilities from "@/components/admin/AdminFacilities";
import { requireAdmin } from "@/lib/auth";
import { listAdminFacilities } from "@/lib/services/admin-facility-service";
import { cleanSearchParams } from "@/lib/validation/facility-query";
import { parseAdminListQuery } from "@/lib/validation/admin-facility";

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
  const query = parsed.ok ? parsed.value : { page: 1, perPage: 20 };
  const { items, meta } = await listAdminFacilities(query);

  return (
    <AdminFacilities
      items={items}
      meta={meta}
      filters={{
        search: query.search,
        type: query.type,
        location: query.location,
        status: query.status,
      }}
    />
  );
}
