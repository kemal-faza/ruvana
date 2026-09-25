import type { Metadata } from "next";

import AdminAnalyticsDashboard from "@/components/admin/AdminAnalytics";
import { requireAdmin } from "@/lib/auth";
import { getAnalyticsLocations, getAnalyticsSnapshot } from "@/lib/services/admin-analytics-service";
import { parseAnalyticsFilters, type AnalyticsFilterSearchParams } from "@/lib/validation/admin-analytics";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Analitik — Ruvana",
  description: "Rekap okupansi dan status fasilitas saat ini.",
};

export default async function AdminAnalitikPage({
  searchParams,
}: {
  searchParams: Promise<AnalyticsFilterSearchParams>;
}) {
  await requireAdmin();

  const parsed = parseAnalyticsFilters(await searchParams);
  if (!parsed.ok) {
    const locations = await getAnalyticsLocations();
    return (
      <AdminAnalyticsDashboard
        filters={parsed.values}
        locations={locations}
        snapshot={null}
        errors={parsed.errors}
      />
    );
  }

  const result = await getAnalyticsSnapshot(parsed.value);
  if (!result.ok) {
    return (
      <AdminAnalyticsDashboard
        filters={{ ...parsed.value, location: parsed.value.location ?? "" }}
        locations={result.locations}
        snapshot={null}
        errors={result.errors}
      />
    );
  }

  return (
    <AdminAnalyticsDashboard
      filters={{ ...parsed.value, location: parsed.value.location ?? "" }}
      locations={result.data.locations}
      snapshot={result.data}
      errors={[]}
    />
  );
}
