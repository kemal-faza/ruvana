import bcrypt from "bcryptjs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccountStatus, Role } from "@/generated/prisma/enums";
import { createSession } from "@/lib/auth";
import { createPendingUser, findUserForLogin } from "@/lib/db/auth";
import { clearLoginFailures, loginBlocked, recordLoginFailure } from "@/lib/login-rate-limit";
import { loginWithCredentials, registerUser } from "./auth-service";

vi.mock("@/lib/db/auth", () => ({ createPendingUser: vi.fn(), findUserForLogin: vi.fn() }));
vi.mock("@/lib/auth", () => ({ createSession: vi.fn(), destroySession: vi.fn(), getSessionUser: vi.fn() }));
vi.mock("@/lib/login-rate-limit", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/login-rate-limit")>();
  return { ...original, loginBlocked: vi.fn(), recordLoginFailure: vi.fn(), clearLoginFailures: vi.fn() };
});

const input = { email: " USER@KAMPUS.AC.ID ", password: "rahasia123" };
const account = {
  id: 7,
  nama: "Ayu",
  email: "user@kampus.ac.id",
  role: Role.pengguna,
  status: AccountStatus.ACTIVE,
  waktuDaftar: new Date("2026-09-01T00:00:00Z"),
  waktuVerifikasi: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(loginBlocked).mockResolvedValue(false);
  vi.mocked(createSession).mockResolvedValue(new Date("2026-09-25T00:00:00Z"));
});

describe("loginWithCredentials", () => {
  it("membuat sesi untuk akun ACTIVE dan tidak mengirim hash password", async () => {
    vi.mocked(findUserForLogin).mockResolvedValue({ ...account, password: await bcrypt.hash(input.password, 4) });
    const result = await loginWithCredentials(input, "127.0.0.1");
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.user).toMatchObject({ id: 7, role: Role.pengguna, status: AccountStatus.ACTIVE });
      expect(result.user).not.toHaveProperty("password");
    }
    expect(findUserForLogin).toHaveBeenCalledWith("user@kampus.ac.id");
    expect(createSession).toHaveBeenCalledWith(7);
    expect(clearLoginFailures).toHaveBeenCalledOnce();
  });

  it("menolak akun PENDING dan password yang melebihi 72 byte dengan hasil generik", async () => {
    const passwordBatas = `a1${"x".repeat(70)}`;
    vi.mocked(findUserForLogin).mockResolvedValue({ ...account, status: AccountStatus.PENDING, password: await bcrypt.hash(input.password, 4) });
    expect((await loginWithCredentials(input, "127.0.0.1")).kind).toBe("invalid");
    vi.mocked(findUserForLogin).mockResolvedValue({ ...account, password: await bcrypt.hash(passwordBatas, 4) });
    expect((await loginWithCredentials({ ...input, password: `${passwordBatas}z` }, "127.0.0.1")).kind).toBe("invalid");
    expect(recordLoginFailure).toHaveBeenCalledTimes(2);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("membatasi percobaan sebelum membaca akun", async () => {
    vi.mocked(loginBlocked).mockResolvedValue(true);
    expect((await loginWithCredentials(input, "127.0.0.1")).kind).toBe("rate_limited");
    expect(findUserForLogin).not.toHaveBeenCalled();
  });
});

describe("registerUser", () => {
  it("menyimpan email ternormalisasi dan hanya mengembalikan user aman", async () => {
    vi.mocked(createPendingUser).mockResolvedValue({ ...account, role: Role.pengguna, status: AccountStatus.PENDING });
    const result = await registerUser({ nama: " Ayu ", email: " USER@KAMPUS.AC.ID ", password: "rahasia123" });
    expect(result.kind).toBe("ok");
    expect(createPendingUser).toHaveBeenCalledWith("Ayu", "user@kampus.ac.id", expect.not.stringMatching(/^rahasia123$/));
    if (result.kind === "ok") {
      expect(result.user.status).toBe(AccountStatus.PENDING);
      expect(result.user).not.toHaveProperty("password");
      expect(result.user.waktuVerifikasi).toBeNull();
    }
  });

  it("menolak password lebih dari 72 byte sebelum menulis akun", async () => {
    const result = await registerUser({ nama: "Ayu", email: "ayu@kampus.ac.id", password: "é".repeat(37) });
    expect(result.kind).toBe("validation");
    expect(createPendingUser).not.toHaveBeenCalled();
  });
});
