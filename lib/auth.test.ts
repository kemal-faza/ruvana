import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStatus, Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getSessionUser, getSessionUserId, requirePetugas } from "@/lib/auth";

const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn((destination: string) => {
    throw new Error(`redirect:${destination}`);
  }),
}));

vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

const cookieValues = new Map<string, string>();
const storedSessions = new Map<string, { userId: number; expiresAt: Date }>();
const setCookie = vi.fn((name: string, value: string) => cookieValues.set(name, value));
const deleteCookie = vi.fn((name: string) => cookieValues.delete(name));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => cookieValues.has(name) ? { value: cookieValues.get(name) } : undefined,
    set: setCookie,
    delete: deleteCookie,
  })),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    session: { create: vi.fn(), findUnique: vi.fn(), deleteMany: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

beforeEach(() => {
  cookieValues.clear();
  storedSessions.clear();
  vi.clearAllMocks();
  vi.mocked(prisma.session.create).mockImplementation((async ({ data }: { data: { tokenHash: string; userId: number; expiresAt: Date } }) => {
    storedSessions.set(data.tokenHash, { userId: data.userId, expiresAt: data.expiresAt });
    return data;
  }) as never);
  vi.mocked(prisma.session.findUnique).mockImplementation((async ({ where }: { where: { tokenHash: string } }) =>
    storedSessions.get(where.tokenHash) ?? null) as never);
  vi.mocked(prisma.session.deleteMany).mockImplementation((async ({ where }: { where: { tokenHash: string } }) => {
    storedSessions.delete(where.tokenHash);
    return { count: 1 };
  }) as never);
});

afterEach(() => vi.unstubAllEnvs());

describe("sesi", () => {
  it("memberi atribut aman pada cookie sesi production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await createSession(12);

    expect(setCookie).toHaveBeenCalledWith(
      "ruvana_session",
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: "lax", secure: true, path: "/" }),
    );
  });

  it("mencabut token lama saat logout meski cookie lama dipakai lagi", async () => {
    await createSession(12);
    const token = cookieValues.get("ruvana_session")!;
    expect(await getSessionUserId()).toBe(12);
    expect(setCookie).toHaveBeenCalledWith("ruvana_session", token, expect.objectContaining({ httpOnly: true, sameSite: "lax" }));

    await destroySession();
    cookieValues.set("ruvana_session", token);

    expect(await getSessionUserId()).toBeNull();
  });

  it("menolak sesi akun yang sudah dinonaktifkan", async () => {
    await createSession(12);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 12,
      nama: "Pengguna Nonaktif",
      email: "nonaktif@ruvana.test",
      role: Role.pengguna,
      status: AccountStatus.DISABLED,
    } as never);

    expect(await getSessionUser()).toBeNull();
  });

  it("hanya mengembalikan akun petugas aktif untuk halaman khusus petugas", async () => {
    await createSession(12);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 12,
      nama: "Petugas Kampus",
      email: "petugas@ruvana.test",
      role: Role.petugas,
      status: AccountStatus.ACTIVE,
      waktuDaftar: new Date("2026-09-01T00:00:00Z"),
      waktuVerifikasi: new Date("2026-09-01T00:00:00Z"),
    } as never);

    await expect(requirePetugas()).resolves.toMatchObject({ id: 12, role: Role.petugas });
  });

  it("mengalihkan sesi tanpa login ke login dan peran lain ke akses ditolak", async () => {
    await expect(requirePetugas()).rejects.toThrow("redirect:/login");
    expect(mockRedirect).toHaveBeenLastCalledWith("/login");

    await createSession(12);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 12,
      nama: "Admin Kampus",
      email: "admin@ruvana.test",
      role: Role.admin,
      status: AccountStatus.ACTIVE,
      waktuDaftar: new Date("2026-09-01T00:00:00Z"),
      waktuVerifikasi: new Date("2026-09-01T00:00:00Z"),
    } as never);

    await expect(requirePetugas()).rejects.toThrow("redirect:/403");
    expect(mockRedirect).toHaveBeenLastCalledWith("/403");
  });
});
