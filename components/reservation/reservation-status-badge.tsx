import { BADGE_STATUS_RESERVASI, LABEL_STATUS_RESERVASI } from "@/config/labels";
import { Badge } from "@/components/ui/badge";
import type { StatusReservasi } from "@/generated/prisma/enums";

interface ReservationStatusBadgeProps {
  status: StatusReservasi;
}

export function ReservationStatusBadge({ status }: ReservationStatusBadgeProps) {
  return <Badge variant={BADGE_STATUS_RESERVASI[status]}>{LABEL_STATUS_RESERVASI[status]}</Badge>;
}
