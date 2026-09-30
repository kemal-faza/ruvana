import { BADGE_STATUS_RESERVASI, LABEL_STATUS_RESERVASI } from "@/config/labels";
import { Badge } from "@/components/ui/badge";
import type { StatusReservasi } from "@/generated/prisma/enums";

interface ReservationStatusBadgeProps {
  status: StatusReservasi;
  label?: string;
}

export function ReservationStatusBadge({ status, label }: ReservationStatusBadgeProps) {
  return <Badge variant={BADGE_STATUS_RESERVASI[status]}>{label ?? LABEL_STATUS_RESERVASI[status]}</Badge>;
}
