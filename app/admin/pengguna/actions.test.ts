import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStatus, Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { buatAkun, ubahStatusAkun, verifikasiPendaftaran } from "./actions";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { create: vi.fn(), updateMany: vi.fn() },
    session: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const state = { ok: false, pesan: "" };

function form(keputusan: string, id = "7") {
  const data = new FormData();
  data.set("id", id);
  data.set("keputusan", keputusan);
  return data;
}

function formStatus(tindakan: string, id = "7") {
  const data = new FormData();
  data.set("id", id);
  data.set("tindakan", tindakan);
  return data;
}

function formAkun(password: string, nama = "Siti Aminah", email = "siti@kampus.ac.id") {
  const data = new FormData();
  data.set("nama", nama);
  data.set("email", email);
  data.set("password", password);
  data.set("role", "pengguna");
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ id: 1, role: Role.admin } as never);
  vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as never);
  vi.mocked(prisma.$transaction).mockImplementation((async (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma)) as never);
});

describe("buatAkun", () => {
  it("menerima password tepat 72 byte dan mencatat admin pembuat akun", async () => {
    const result = await buatAkun(state, formAkun(`a1${"é".repeat(35)}`));

    expect(result.ok).toBe(true);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        password: expect.any(String),
        dibuatOleh: 1,
        status: AccountStatus.ACTIVE,
      }),
    });
  });

  it("menolak password lebih dari 72 byte sebelum membuat akun", async () => {
    const result = await buatAkun(state, formAkun(`a1x${"é".repeat(35)}`));

    expect(result.fieldErrors?.password).toEqual(["Password maksimal 72 byte."]);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it("menolak nama dan email melebihi batas sebelum membuat akun", async () => {
    const result = await buatAkun(
      state,
      formAkun("rahasia123", "A".repeat(101), `${"a".repeat(243)}@kampus.ac.id`),
    );

    expect(result.fieldErrors?.nama).toBeDefined();
    expect(result.fieldErrors?.email).toBeDefined();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

describe("ubahStatusAkun", () => {
  it("menonaktifkan akun ACTIVE dan mencabut semua sesinya dalam transaksi", async () => {
    const result = await ubahStatusAkun(state, formStatus("nonaktifkan"));

    expect(result.ok).toBe(true);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 7, status: AccountStatus.ACTIVE },
      data: { status: AccountStatus.DISABLED },
    });
    expect(prisma.session.deleteMany).toHaveBeenCalledWith({ where: { userId: 7 } });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/pengguna");
  });

  it("mengaktifkan kembali hanya akun DISABLED tanpa mengubah role atau histori", async () => {
    const result = await ubahStatusAkun(state, formStatus("aktifkan"));

    expect(result.ok).toBe(true);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 7, status: AccountStatus.DISABLED },
      data: { status: AccountStatus.ACTIVE },
    });
    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
  });

  it("menolak perubahan status yang sudah diproses dan upaya menonaktifkan diri", async () => {
    vi.mocked(prisma.user.updateMany).mockResolvedValueOnce({ count: 0 } as never);
    expect((await ubahStatusAkun(state, formStatus("nonaktifkan"))).ok).toBe(false);
    expect(prisma.session.deleteMany).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();

    expect((await ubahStatusAkun(state, formStatus("nonaktifkan", "1"))).ok).toBe(false);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
  });

  it("menolak input tidak valid dan akses tanpa admin", async () => {
    expect((await ubahStatusAkun(state, formStatus("aktifkan", "0"))).ok).toBe(false);
    expect((await ubahStatusAkun(state, formStatus("lainnya"))).ok).toBe(false);
    expect(prisma.$transaction).not.toHaveBeenCalled();

    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Akses ditolak"));
    await expect(ubahStatusAkun(state, formStatus("aktifkan"))).rejects.toThrow("Akses ditolak");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe("verifikasiPendaftaran", () => {
  it("menyetujui hanya pengguna PENDING dan mencatat waktu verifikasi", async () => {
    const result = await verifikasiPendaftaran(state, form("setujui"));

    expect(result.ok).toBe(true);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 7, role: Role.pengguna, status: AccountStatus.PENDING },
      data: { status: AccountStatus.ACTIVE, waktuVerifikasi: expect.any(Date) },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/pengguna");
  });

  it("menolak pengguna PENDING tanpa mencatat waktu persetujuan", async () => {
    const result = await verifikasiPendaftaran(state, form("tolak"));

    expect(result.ok).toBe(true);
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: 7, role: Role.pengguna, status: AccountStatus.PENDING },
      data: { status: AccountStatus.REJECTED },
    });
  });

  it("menolak pemrosesan ulang akun secara aman", async () => {
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 0 } as never);

    expect((await verifikasiPendaftaran(state, form("setujui"))).ok).toBe(false);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("tidak memperbarui akun untuk input tidak valid atau admin tanpa izin", async () => {
    expect((await verifikasiPendaftaran(state, form("setujui", "0"))).ok).toBe(false);
    expect((await verifikasiPendaftaran(state, form("lainnya"))).ok).toBe(false);
    expect(prisma.user.updateMany).not.toHaveBeenCalled();

    vi.mocked(requireAdmin).mockRejectedValueOnce(new Error("Akses ditolak"));
    await expect(verifikasiPendaftaran(state, form("setujui"))).rejects.toThrow("Akses ditolak");
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });
});
