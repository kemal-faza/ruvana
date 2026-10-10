import type { Role, StatusFasilitas } from "@/generated/prisma/enums";

/** Matriks transisi admin (FAC-05): satu-satunya jalur yang boleh menyentuh INACTIVE. */
export const TRANSISI_STATUS_ADMIN: Record<StatusFasilitas, readonly StatusFasilitas[]> = {
  ACTIVE: ["UNDER_MAINTENANCE", "INACTIVE"],
  UNDER_MAINTENANCE: ["ACTIVE", "INACTIVE"],
  INACTIVE: ["ACTIVE"],
};

// Jalur operasional petugas (REP-04, ACTIVE <-> UNDER_MAINTENANCE) tidak diulang
// di sini: satu-satunya sumber kebenaran adalah config/business.ts
// (TRANSISI_STATUS_FASILITAS_OPERASIONAL), yang dipakai langsung oleh
// lib/services/facility-status-service.ts.
const MATRIKS: Partial<Record<Role, Record<StatusFasilitas, readonly StatusFasilitas[]>>> = {
  admin: TRANSISI_STATUS_ADMIN,
};

const TANPA_TRANSISI: readonly StatusFasilitas[] = [];

export function allowedTransitions(from: StatusFasilitas, role: Role): readonly StatusFasilitas[] {
  return MATRIKS[role]?.[from] ?? TANPA_TRANSISI;
}

export function canTransition(from: StatusFasilitas, to: StatusFasilitas, role: Role): boolean {
  return MATRIKS[role]?.[from]?.includes(to) ?? false;
}
