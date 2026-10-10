import type { Metadata } from "next"

import { ReportsView } from "@/components/reports/reports-view"
import { requirePengguna } from "@/lib/auth"
import { listMyReports, listReportFacilityOptions } from "@/lib/services/report-service"

export const dynamic = "force-dynamic"

const description =
  "Lihat status dan catatan penyelesaian laporan kerusakan yang Anda kirim."

export const metadata: Metadata = {
  title: "Laporan | ruvana",
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
  const user = await requirePengguna()

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
