import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStatus, Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { createSession, destroySession, getSessionUser, getSessionUserId } from "@/lib/auth";

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

describe("sesi", () => {
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
});
