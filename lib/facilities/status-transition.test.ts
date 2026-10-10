import { describe, expect, it } from "vitest";

import { TRANSISI_STATUS_FASILITAS_OPERASIONAL } from "@/config/business";
import type { Role, StatusFasilitas } from "@/generated/prisma/enums";
import {
  TRANSISI_STATUS_ADMIN,
  allowedTransitions,
  canTransition,
} from "./status-transition";

type Transisi = [StatusFasilitas, StatusFasilitas, Role, boolean];

describe("canTransition", () => {
  it.each<Transisi>([
    ["ACTIVE", "UNDER_MAINTENANCE", "admin", true],
    ["UNDER_MAINTENANCE", "ACTIVE", "admin", true],
    ["ACTIVE", "INACTIVE", "admin", true],
    ["INACTIVE", "ACTIVE", "admin", true],
    ["UNDER_MAINTENANCE", "INACTIVE", "admin", true],
    ["INACTIVE", "UNDER_MAINTENANCE", "admin", false],
    ["ACTIVE", "ACTIVE", "admin", false],
  ])("%s -> %s sebagai %s = %s", (from, to, role, expected) => {
    expect(canTransition(from, to, role)).toBe(expected);
  });

  it("hanya admin yang memiliki matriks; peran lain tidak pernah bisa transisi", () => {
    expect(canTransition("ACTIVE", "UNDER_MAINTENANCE", "petugas")).toBe(false);
    expect(canTransition("UNDER_MAINTENANCE", "ACTIVE", "petugas")).toBe(false);
    expect(canTransition("ACTIVE", "UNDER_MAINTENANCE", "pengguna")).toBe(false);
  });
});

describe("matriks", () => {
  it("jalur operasional petugas (REP-04) tetap satu-satunya sumber di config", () => {
    expect(TRANSISI_STATUS_FASILITAS_OPERASIONAL.ACTIVE).toBe("UNDER_MAINTENANCE");
    expect(TRANSISI_STATUS_FASILITAS_OPERASIONAL.UNDER_MAINTENANCE).toBe("ACTIVE");
  });

  it("pengguna tidak boleh mengubah status fasilitas", () => {
    expect(allowedTransitions("ACTIVE", "pengguna")).toEqual([]);
    expect(allowedTransitions("UNDER_MAINTENANCE", "pengguna")).toEqual([]);
    expect(allowedTransitions("INACTIVE", "pengguna")).toEqual([]);
  });

  it("admin boleh kembali ke ACTIVE dari INACTIVE", () => {
    expect(TRANSISI_STATUS_ADMIN.INACTIVE).toEqual(["ACTIVE"]);
  });
});
