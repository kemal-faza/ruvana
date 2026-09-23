import { BADGE_STATUS_FASILITAS, LABEL_STATUS_FASILITAS } from "@/config/labels"
import { Badge } from "@/components/ui/badge"

interface FacilityStatusBadgeProps {
  status: "ACTIVE" | "UNDER_MAINTENANCE"
}

export function FacilityStatusBadge({ status }: FacilityStatusBadgeProps) {
  return <Badge variant={BADGE_STATUS_FASILITAS[status]}>{LABEL_STATUS_FASILITAS[status]}</Badge>
}
