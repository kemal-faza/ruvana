import { Badge } from "@/components/ui/badge"
import { BADGE_STATUS_LAPORAN, LABEL_STATUS_LAPORAN } from "@/config/labels"
import type { ReportStatus } from "@/lib/services/report-service"

interface ReportStatusBadgeProps {
  status: ReportStatus
}

export function ReportStatusBadge({ status }: ReportStatusBadgeProps) {
  return <Badge variant={BADGE_STATUS_LAPORAN[status]}>{LABEL_STATUS_LAPORAN[status]}</Badge>
}