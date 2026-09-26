import type { Metadata } from "next"

import { ReportsView } from "@/components/reports/reports-view"
import { getSessionUser } from "@/lib/auth"
import { listMyReports, listReportFacilityOptions } from "@/lib/services/report-service"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

const description =
  "Pantau laporan kerusakan fasilitas kampus yang telah Anda ajukan beserta progres penanganannya."

export const metadata: Metadata = {
  title: "Laporan",
  description,
  alternates: {
    canonical: "/reports",
  },
  openGraph: {
    type: "website",
    title: "Laporan",
    description,
    url: "/reports",
  },
}

export default async function ReportsPage() {
  const user = await getSessionUser()
  if (!user) redirect("/login")

  const [view, facilityOptions] = await Promise.all([
    listMyReports({ userId: user.id }),
    listReportFacilityOptions(),
  ])

  return (
    <div className="flex flex-col gap-8">
      <ReportsView view={view} facilityOptions={facilityOptions} />
    </div>
  )
}
