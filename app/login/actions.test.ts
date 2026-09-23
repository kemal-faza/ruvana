import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStatus, Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { clearLoginFailures, loginBlocked, recordLoginFailure } from "@/lib/login-rate-limit";
import { login } from "./actions";

vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn() } } }));
vi.mock("@/lib/auth", () => ({ createSession: vi.fn(), destroySession: vi.fn() }));
vi.mock("@/lib/login-rate-limit", () => ({
  loginAttemptKey: vi.fn().mockResolvedValue("attempt-key"),
  loginBlocked: vi.fn().mockResolvedValue(false),
  recordLoginFailure: vi.fn(),
  clearLoginFailures: vi.fn(),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn((path: string) => { throw new Error(`REDIRECT:${path}`); }) }));

const state = { ok: false, pesan: "" };
const password = "rahasia123";

function form() {
  const data = new FormData();
  data.set("email", " USER@KAMPUS.AC.ID ");
  data.set("password", password);
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loginBlocked).mockResolvedValue(false);
});

describe("login", () => {
  it.each([AccountStatus.PENDING, AccountStatus.REJECTED, AccountStatus.DISABLED])(
    "menolak akun %s dengan pesan kredensial generik",
    async (status) => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 1,
        role: Role.pengguna,
        status,
        password: await bcrypt.hash(password, 4),
      } as never);

      const result = await login(state, form());

      expect(result.pesan).toBe("Email atau kata sandi salah.");
      expect(recordLoginFailure).toHaveBeenCalledWith("attempt-key");
      expect(createSession).not.toHaveBeenCalled();
      expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: "user@kampus.ac.id" } }));
    },
  );

  it("memberi pesan sama untuk email yang tidak ada", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    expect((await login(state, form())).pesan).toBe("Email atau kata sandi salah.");
  });

  it("membuat sesi hanya bagi akun aktif dengan kata sandi benar", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 7,
      role: Role.pengguna,
      status: AccountStatus.ACTIVE,
      password: await bcrypt.hash(password, 4),
    } as never);

    await expect(login(state, form())).rejects.toThrow("REDIRECT:/");
    expect(createSession).toHaveBeenCalledWith(7);
    expect(clearLoginFailures).toHaveBeenCalledWith("attempt-key");
  });

  it("menolak percobaan setelah batas tanpa membaca akun", async () => {
    vi.mocked(loginBlocked).mockResolvedValue(true);
    expect((await login(state, form())).pesan).toMatch(/Terlalu banyak percobaan/);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
