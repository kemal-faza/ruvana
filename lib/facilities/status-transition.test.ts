import { describe, expect, it } from "vitest";

import { TRANSISI_STATUS_FASILITAS_OPERASIONAL } from "@/config/business";
import type { Role, StatusFasilitas } from "@/generated/prisma/enums";
import {
  TRANSISI_STATUS_ADMIN,
  TRANSISI_STATUS_PETUGAS,
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
    ["ACTIVE", "UNDER_MAINTENANCE", "petugas", true],
    ["UNDER_MAINTENANCE", "ACTIVE", "petugas", true],
    ["ACTIVE", "INACTIVE", "petugas", false],
    ["INACTIVE", "ACTIVE", "petugas", false],
    ["ACTIVE", "UNDER_MAINTENANCE", "pengguna", false],
  ])("%s -> %s sebagai %s = %s", (from, to, role, expected) => {
    expect(canTransition(from, to, role)).toBe(expected);
  });
});

describe("matriks", () => {
  it("matriks petugas sama dengan matriks operasional di config", () => {
    expect(TRANSISI_STATUS_PETUGAS.ACTIVE).toEqual([
      TRANSISI_STATUS_FASILITAS_OPERASIONAL.ACTIVE,
    ]);
    expect(TRANSISI_STATUS_PETUGAS.UNDER_MAINTENANCE).toEqual([
      TRANSISI_STATUS_FASILITAS_OPERASIONAL.UNDER_MAINTENANCE,
    ]);
    expect(TRANSISI_STATUS_PETUGAS.INACTIVE).toEqual([]);
  });

  it("pengguna tidak boleh melakukan transisi apa pun", () => {
    expect(allowedTransitions("ACTIVE", "pengguna")).toEqual([]);
    expect(allowedTransitions("UNDER_MAINTENANCE", "pengguna")).toEqual([]);
    expect(allowedTransitions("INACTIVE", "pengguna")).toEqual([]);
  });

  it("admin boleh kembali ke ACTIVE dari INACTIVE", () => {
    expect(TRANSISI_STATUS_ADMIN.INACTIVE).toEqual(["ACTIVE"]);
  });
});
