import { DURASI_SLOT_MENIT, JAM_OPERASIONAL } from "@/config/business";
import type { CalendarDate } from "@/lib/time/jakarta";
import { jakartaToUtc } from "@/lib/time/jakarta";

export interface SlotWindow {
  startTime: string; // "HH:MM" WIB
  endTime: string; // "HH:MM" WIB
}

export type BlockedBy = "APPROVED" | "MAINTENANCE" | null;

export interface AvailabilitySlot extends SlotWindow {
  available: boolean;
  blockedBy: BlockedBy;
}

export interface ApprovedInterval {
  startTime: Date;
  endTime: Date;
}

export interface ComputeAvailabilityParams {
  date: CalendarDate;
  status: "ACTIVE" | "UNDER_MAINTENANCE";
  approvedIntervals: ApprovedInterval[];
}

function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTime(totalMinutes: number): string {
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Slot 30 menit dari jam operasional; jumlah diturunkan dari config/business.ts, bukan hardcode. */
export function generateDailySlots(): SlotWindow[] {
  const start = timeToMinutes(JAM_OPERASIONAL.mulai);
  const end = timeToMinutes(JAM_OPERASIONAL.selesai);

  const slots: SlotWindow[] = [];
  for (let minute = start; minute < end; minute += DURASI_SLOT_MENIT) {
    slots.push({ startTime: minutesToTime(minute), endTime: minutesToTime(minute + DURASI_SLOT_MENIT) });
  }
  return slots;
}

/**
 * Menghitung status 26 slot untuk satu tanggal. Reservasi PENDING tidak boleh
 * ikut di approvedIntervals (hanya APPROVED yang memblokir ketersediaan).
 */
export function computeAvailability({ date, status, approvedIntervals }: ComputeAvailabilityParams): AvailabilitySlot[] {
  const slots = generateDailySlots();

  if (status === "UNDER_MAINTENANCE") {
    return slots.map((slot) => ({ ...slot, available: false, blockedBy: "MAINTENANCE" as const }));
  }

  return slots.map((slot) => {
    const slotStart = jakartaToUtc(date, slot.startTime);
    const slotEnd = jakartaToUtc(date, slot.endTime);
    const blocked = approvedIntervals.some(
      (interval) => slotStart < interval.endTime && slotEnd > interval.startTime,
    );
    return { ...slot, available: !blocked, blockedBy: blocked ? ("APPROVED" as const) : null };
  });
}
