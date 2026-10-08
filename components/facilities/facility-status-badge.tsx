import { BADGE_STATUS_FASILITAS, LABEL_STATUS_FASILITAS } from "@/config/labels"
import { Badge } from "@/components/ui/badge"
import type { StatusFasilitas } from "@/generated/prisma/enums"

interface FacilityStatusBadgeProps {
  status: StatusFasilitas
}

export function FacilityStatusBadge({ status }: FacilityStatusBadgeProps) {
  return <Badge variant={BADGE_STATUS_FASILITAS[status]}>{LABEL_STATUS_FASILITAS[status]}</Badge>
}
