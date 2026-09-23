import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStatus, Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { daftar } from "./actions";

vi.mock("@/lib/prisma", () => ({ prisma: { user: { create: vi.fn() } } }));

beforeEach(() => vi.clearAllMocks());

describe("daftar", () => {
  it("menyimpan email ternormalisasi, hash, role pengguna, dan status PENDING", async () => {
    const form = new FormData();
    form.set("nama", "  Siti Aminah ");
    form.set("email", " SITI@KAMPUS.AC.ID ");
    form.set("password", "rahasia123");

    const result = await daftar({ ok: false, pesan: "" }, form);

    expect(result.ok).toBe(true);
    expect(prisma.user.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      nama: "Siti Aminah",
      email: "siti@kampus.ac.id",
      role: Role.pengguna,
      status: AccountStatus.PENDING,
      password: expect.not.stringMatching(/^rahasia123$/),
    }) });
  });

  it("menolak kata sandi lebih dari 72 byte sebelum membuat akun", async () => {
    const form = new FormData();
    form.set("nama", "Siti Aminah");
    form.set("email", "siti@kampus.ac.id");
    form.set("password", "é".repeat(37));

    const result = await daftar({ ok: false, pesan: "" }, form);

    expect(result.fieldErrors?.password).toBeDefined();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
