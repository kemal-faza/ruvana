import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStatus, Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { verifikasiPendaftaran } from "./actions";

vi.mock("@/lib/prisma", () => ({ prisma: { user: { create: vi.fn(), updateMany: vi.fn() } } }));
vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const state = { ok: false, pesan: "" };

function form(keputusan: string, id = "7") {
  const data = new FormData();
  data.set("id", id);
  data.set("keputusan", keputusan);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ id: 1, role: Role.admin } as never);
  vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as never);
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
