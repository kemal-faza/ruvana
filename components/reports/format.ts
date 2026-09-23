import { format, formatDistanceToNow } from "date-fns"
import { id } from "date-fns/locale"

export function formatWaktu(value: string): string {
  return format(new Date(value), "d MMM yyyy, HH:mm", { locale: id })
}

export function formatRelatif(value: string): string {
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: id })
}