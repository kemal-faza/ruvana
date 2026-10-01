import type { Role, StatusFasilitas } from "@/generated/prisma/enums";

/** Matriks transisi admin (FAC-05): satu-satunya jalur yang boleh menyentuh INACTIVE. */
export const TRANSISI_STATUS_ADMIN: Record<StatusFasilitas, readonly StatusFasilitas[]> = {
  ACTIVE: ["UNDER_MAINTENANCE", "INACTIVE"],
  UNDER_MAINTENANCE: ["ACTIVE", "INACTIVE"],
  INACTIVE: ["ACTIVE"],
};

/** Matriks petugas (REP-04): hanya ACTIVE <-> UNDER_MAINTENANCE. */
export const TRANSISI_STATUS_PETUGAS: Record<StatusFasilitas, readonly StatusFasilitas[]> = {
  ACTIVE: ["UNDER_MAINTENANCE"],
  UNDER_MAINTENANCE: ["ACTIVE"],
  INACTIVE: [],
};

const MATRIKS: Record<Role, Record<StatusFasilitas, readonly StatusFasilitas[]>> = {
  admin: TRANSISI_STATUS_ADMIN,
  petugas: TRANSISI_STATUS_PETUGAS,
  pengguna: { ACTIVE: [], UNDER_MAINTENANCE: [], INACTIVE: [] },
};

export function allowedTransitions(from: StatusFasilitas, role: Role): readonly StatusFasilitas[] {
  return MATRIKS[role][from];
}

export function canTransition(from: StatusFasilitas, to: StatusFasilitas, role: Role): boolean {
  return MATRIKS[role][from].includes(to);
}
