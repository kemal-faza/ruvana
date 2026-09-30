import { BADGE_STATUS_RESERVASI, LABEL_STATUS_RESERVASI } from "@/config/labels";
import { Badge } from "@/components/ui/badge";
import type { StatusReservasi } from "@/generated/prisma/enums";

type ReservationStatusBadgeProps =
  | { status: StatusReservasi; label?: string; variant?: never }
  | { status?: never; label: string; variant: (typeof BADGE_STATUS_RESERVASI)[StatusReservasi] };

export function ReservationStatusBadge(props: ReservationStatusBadgeProps) {
  if ("variant" in props) {
    return <Badge variant={props.variant}>{props.label}</Badge>;
  }

  return (
    <Badge variant={BADGE_STATUS_RESERVASI[props.status]}>
      {props.label ?? LABEL_STATUS_RESERVASI[props.status]}
    </Badge>
  );
}
